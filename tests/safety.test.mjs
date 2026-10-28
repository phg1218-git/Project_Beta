import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

const load = sourceLoader()
const { safeRedirect, safeReturnPath } = load('src/lib/redirect.ts')
const { revenuePeriod } = load('src/lib/revenue-period.ts')
const { orderRequestId, samePurchase } = load('src/lib/order-request.ts')

test('복귀 URL: 같은 출처만 허용하고 우회·잘못된 주소·로그인 루프를 차단', () => {
  const base = 'https://shop.example'
  for (const input of ['https://shop.example.attacker.test', '//attacker.test', '/\\attacker.test', 'javascript:alert(1)', 'http://shop.example', 'https://user@shop.example']) {
    assert.equal(safeRedirect(input, base), base)
  }
  assert.equal(safeRedirect('/products/abc?quantity=2', base), base + '/products/abc?quantity=2')
  assert.equal(safeReturnPath('//attacker.test'), '/products')
  assert.equal(safeReturnPath('/login?callbackUrl=/login'), '/products')
  assert.equal(safeReturnPath('/cart'), '/cart')
})

test('한국 시간의 월말·연말·윤년 집계 경계', () => {
  const october = revenuePeriod(new Date('2026-09-30T15:00:00Z'))
  assert.equal(october.startOfMonth.toISOString(), '2026-09-30T15:00:00.000Z')
  assert.equal(october.startOfLastMonth.toISOString(), '2026-08-31T15:00:00.000Z')
  assert.ok(new Date('2026-09-30T14:59:59Z') < october.startOfMonth)
  const january = revenuePeriod(new Date('2026-12-31T15:00:00Z'))
  assert.equal(january.startOfLastMonth.toISOString(), '2026-11-30T15:00:00.000Z')
  const march = revenuePeriod(new Date('2024-03-01T00:00:00Z'))
  assert.ok(new Date('2024-02-29T14:59:59Z') < march.startOfMonth)
})

test('요청 키는 고객별로 분리되고 같은 키에서 수량·배송지 변경을 검출', () => {
  assert.equal(orderRequestId('a', 'key'), orderRequestId('a', 'key'))
  assert.notEqual(orderRequestId('a', 'key'), orderRequestId('b', 'key'))
  const item = { productId: 'p', quantity: 1, recipientName: '고객', recipientPhone: '01012345678', recipientAddressBase: '주소', recipientAddressDetail: null }
  const order = { depositorName: '고객', items: [item] }
  assert.ok(samePurchase(order, structuredClone(order)))
  assert.ok(!samePurchase(order, { ...order, items: [{ ...item, quantity: 2 }] }))
  assert.ok(!samePurchase(order, { ...order, items: [{ ...item, recipientAddressBase: '다른 주소' }] }))
})

test('JWT에 ADMIN이 남아 있어도 DB에서 회수된 권한은 거부', async () => {
  const loader = sourceLoader({
    '@/auth': { auth: async () => ({ user: { id: 'u', role: 'ADMIN' } }) },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ role: 'USER' }) } } },
  })
  assert.equal(await loader('src/lib/admin-auth.ts').adminAuth(), null)
})
