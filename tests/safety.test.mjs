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

function orderHarness(initialStatus = 'DRAFT', failStock = false) {
  let state = { status: initialStatus, stock: 8, paymentRequests: 0 }
  let queue = Promise.resolve()
  const snapshot = () => ({ id: 'o', userId: 'u', status: state.status, createdAt: new Date(0), items: [{ productId: 'p', quantity: 2 }] })
  const prisma = {
    order: {
      findFirst: async () => snapshot(),
      findUnique: async () => snapshot(),
      findMany: async ({ where }) => state.status === where.status ? [snapshot()] : [],
    },
    $transaction: async (fn) => {
      const previous = queue
      let release
      queue = new Promise((resolve) => { release = resolve })
      await previous
      const before = structuredClone(state)
      try {
        return await fn({
          order: { updateMany: async ({ where, data }) => {
            if (state.status !== where.status) return { count: 0 }
            state.status = data.status
            return { count: 1 }
          } },
          product: { update: async ({ data }) => {
            if (failStock) throw new Error('simulated stock failure')
            state.stock += data.stock.increment
          } },
          paymentRequest: { create: async () => { state.paymentRequests++ } },
        })
      } catch (error) { state = before; throw error } finally { release() }
    },
  }
  const session = { user: { id: 'u', role: 'ADMIN' } }
  const loader = sourceLoader({
    '@/auth': { auth: async () => session },
    '@/lib/admin-auth': { adminAuth: async () => session },
    '@/lib/prisma': { prisma },
    '@/lib/audit-log': { writeAuditLog: async () => {}, writeAuditLogTx: async () => {} },
  })
  const cancel = loader('src/app/api/orders/[id]/route.ts').DELETE
  const deposit = loader('src/app/api/orders/[id]/deposit-request/route.ts').POST
  const expire = loader('src/app/api/admin/orders/expire/route.ts').POST
  const request = new Request('https://shop.example/api/orders/o')
  const params = { params: Promise.resolve({ id: 'o' }) }
  return { cancel: () => cancel(request, params), deposit: () => deposit(request, params), expire, state: () => state }
}

test('취소 요청이 겹쳐도 실제 핸들러는 재고를 한 번만 복구', async () => {
  const h = orderHarness()
  const results = await Promise.all([h.cancel(), h.cancel()])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  assert.deepEqual(h.state(), { status: 'CANCELED', stock: 10, paymentRequests: 0 })
})

test('취소와 입금요청 충돌 시 하나만 성공', async () => {
  const h = orderHarness()
  const results = await Promise.all([h.deposit(), h.cancel()])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  assert.deepEqual(h.state(), { status: 'DEPOSIT_REQUESTED', stock: 8, paymentRequests: 1 })
})

test('만료 정리는 입금확인 대기 주문을 취소하지 않음', async () => {
  const h = orderHarness('DEPOSIT_REQUESTED')
  const response = await h.expire()
  assert.equal((await response.json()).canceled, 0)
  assert.equal(h.state().status, 'DEPOSIT_REQUESTED')
})

test('만료와 고객 취소가 겹쳐도 재고를 한 번만 복구', async () => {
  const h = orderHarness()
  await Promise.all([h.expire(), h.cancel()])
  assert.equal(h.state().stock, 10)
})

test('재고 복구 실패 시 상태도 롤백하고 성공 건수를 증가시키지 않음', async () => {
  const h = orderHarness('DRAFT', true)
  const result = await (await h.expire()).json()
  assert.equal(result.canceled, 0)
  assert.equal(result.restoredStock, 0)
  assert.equal(h.state().status, 'DRAFT')
})

test('JWT에 ADMIN이 남아 있어도 DB에서 회수된 권한은 거부', async () => {
  const loader = sourceLoader({
    '@/auth': { auth: async () => ({ user: { id: 'u', role: 'ADMIN' } }) },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ role: 'USER' }) } } },
  })
  assert.equal(await loader('src/lib/admin-auth.ts').adminAuth(), null)
})
