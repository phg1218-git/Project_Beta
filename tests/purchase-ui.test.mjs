import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

const { bankAccountNumber } = sourceLoader()('src/lib/bank-account.ts')
test('계좌번호는 은행명·예금주를 제외하고 복사하며 애매한 번호는 추측하지 않음', () => {
  assert.equal(bankAccountNumber('농협 123-4567-8901-23 예금주 홍길동'), '1234567890123')
  assert.equal(bankAccountNumber('국민 123456789012 홍길동'), '123456789012')
  assert.equal(bankAccountNumber('고객센터에 문의해주세요.'), null)
  assert.equal(bankAccountNumber('농협 123456789012 / 국민 987654321098'), null)
})

test('기존 JWT 권한과 무관하게 현재 회원 권한으로 세션 갱신', async () => {
  let role = 'ADMIN'
  let config
  const load = sourceLoader({
    'next-auth': { default: (value) => { config = value; return {} } },
    'next-auth/providers/google': { default: () => ({}) },
    'next-auth/providers/naver': { default: () => ({}) },
    'next-auth/providers/kakao': { default: () => ({}) },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => role ? { role } : null } } },
  })
  load('src/auth.ts')
  const session = () => config.callbacks.session({ session: { user: {} }, token: { id: 'user', role: 'USER' } })
  assert.equal((await session()).user.role, 'ADMIN')
  role = 'USER'
  assert.equal((await session()).user.role, 'USER')
  role = null
  assert.equal((await session()).user.role, 'USER')
})


test('주문관리 주소는 주문 스냅샷을 렌더링하고 같은 주소는 한 번만 표시', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const load = sourceLoader({
    '@/lib/admin-auth': { adminAuth: async () => ({ user: { role: 'ADMIN' } }) },
    '@/lib/prisma': { prisma: { order: {
      count: async () => 1,
      findMany: async () => [{ id: 'order', totalAmount: 20000, status: 'DRAFT', createdAt: new Date(),
        user: { name: '고객', email: 'test@example.com', addressBase: '현재 회원주소' },
        items: [1, 2].map(() => ({ product: { name: '귤' }, recipientAddressBase: '주문 당시 주소', recipientAddressDetail: '101동 202호' })),
      }],
    } } },
    '@/types': sourceLoader()('src/types/index.ts'),
    '@/components/AdminOrderActions': { AdminOrderActions: () => null },
    'next/navigation': { redirect: () => { throw new Error('redirect') } },
  })
  const page = load('src/app/admin/orders/page.tsx').default
  const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }))
  assert.ok(html.includes('주문 당시 주소 101동 202호'))
  assert.equal(html.split('주문 당시 주소').length - 1, 1)
  assert.ok(!html.includes('현재 회원주소'))
})

test('빠른구매 화면은 요청 수량과 서버 상품가격을 사용하고 잘못된 수량을 거부', async () => {
  const load = sourceLoader({
    '@/lib/prisma': { prisma: { product: { findUnique: async () => ({ id: 'p', name: '귤', price: 20000, stock: 5, isActive: true }) } } },
    '@/components/CheckoutForm': { CheckoutForm: () => null },
    'next/navigation': { notFound: () => { throw new Error('not found') } },
  })
  const page = load('src/app/checkout/page.tsx').default
  const element = await page({ searchParams: Promise.resolve({ productId: 'p', quantity: '3' }) })
  assert.equal(element.props.directItem.quantity, 3)
  assert.equal(element.props.directItem.price, 20000)
  for (const quantity of ['0', '-1', '1.5', 'NaN', '10001']) {
    await assert.rejects(page({ searchParams: Promise.resolve({ productId: 'p', quantity }) }), /not found/)
  }
})
