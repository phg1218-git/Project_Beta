import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { sourceLoader } from '../load-source.mjs'

// 반드시 development.mjs로 .env의 연결 설정을 확인한 뒤 실행한다.
if (process.env.DEV_DB_TEST_ALLOWED !== 'true') {
  throw new Error('npm run test:integration으로 로컬 검증 실행기를 통해 실행해주세요.')
}

test('.env PostgreSQL에서 테스트 전용 데이터로 주문·재고·설정 검증', { timeout: 120000 }, async (t) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
  const fixture = `integration_${randomUUID()}`
  const productId = `${fixture}_product`
  const settingsId = `${fixture}_settings`
  const request = (body, key = randomUUID()) => new Request('http://localhost/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body),
  })
  const orderParams = (id) => ({ params: Promise.resolve({ id }) })
  const body = { items: [{ productId, quantity: 2 }], expectedShippingFee: 3000 }
  const client = new Proxy(db, {
    get(target, key) {
      if (key === '$transaction') return (fn) => db.$transaction(fn, { maxWait: 20000, timeout: 20000 })
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const load = sourceLoader({
    '@/lib/prisma': { prisma: client },
    '@/auth': { auth: async () => ({ user: { id: fixture, role: 'ADMIN' } }) },
    '@/lib/store-settings': { getStoreSettings: async () => ({ shippingFee: 3000, bankAccount: '통합 테스트 전용 계좌' }) },
  })
  const createOrder = load('src/app/api/orders/route.ts').POST
  const cancelOrder = load('src/app/api/orders/[id]/route.ts').DELETE
  const deposit = load('src/app/api/orders/[id]/deposit-request/route.ts').POST
  const confirmPayment = load('src/app/api/admin/orders/[id]/confirm-payment/route.ts').POST

  t.after(async () => {
    try {
      // 이 실행에서 생성한 식별자만 정리한다. 기존 개발/운영 데이터에는 접근하지 않는다.
      await db.adminActionLog.deleteMany({ where: { adminId: fixture } })
      await db.order.deleteMany({ where: { userId: fixture } })
      await db.user.deleteMany({ where: { id: fixture } })
      await db.product.deleteMany({ where: { id: productId } })
      await db.storeSettings.deleteMany({ where: { id: settingsId } })
    } finally { await db.$disconnect() }
  })

  await db.user.create({ data: {
    id: fixture, name: '통합 테스트', role: 'ADMIN', profileComplete: true,
    shippingAddresses: { create: { name: '통합 테스트', phone: '01000000000', addressBase: '테스트 전용 주소', isDefault: true } },
  } })
  await db.product.create({ data: { id: productId, name: '통합 테스트 귤', description: '실판매 아님', price: 20000, stock: 40 } })

  let orderId
  await t.test('동일 요청 키를 4개 동시 전송해도 주문 하나와 재고 차감 한 번', async () => {
    const key = randomUUID()
    const responses = await Promise.all(Array.from({ length: 4 }, () => createOrder(request(body, key))))
    assert.ok(responses.every((r) => r.ok), `응답 코드: ${responses.map((r) => r.status)}`)
    const orders = await Promise.all(responses.map((r) => r.json()))
    orderId = orders[0].id
    assert.equal(new Set(orders.map((o) => o.id)).size, 1)
    assert.equal(await db.order.count({ where: { userId: fixture } }), 1)
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: productId } })).stock, 38)
    assert.equal(orders[0].shippingFee, 3000)
    assert.equal(orders[0].totalAmount, 43000)
  })

  await t.test('동시 취소 시 재고 복구 한 번', async () => {
    assert.ok(orderId)
    const responses = await Promise.all(Array.from({ length: 4 }, () => cancelOrder(request({}), orderParams(orderId))))
    assert.equal(responses.filter((r) => r.ok).length, 1)
    assert.ok(responses.every((r) => [200, 400, 409].includes(r.status)))
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: productId } })).stock, 40)
  })

  await t.test('입금 요청과 취소가 경쟁하면 한 상태만 반영', async () => {
    const created = await createOrder(request(body))
    assert.equal(created.status, 201)
    const { id } = await created.json()
    const responses = await Promise.all([deposit(request({}), orderParams(id)), cancelOrder(request({}), orderParams(id))])
    assert.equal(responses.filter((r) => r.ok).length, 1)
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { paymentRequest: true } })
    const stock = (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock
    if (order.status === 'CANCELED') {
      assert.equal(stock, 40)
      assert.equal(order.paymentRequest, null)
    } else {
      assert.equal(order.status, 'DEPOSIT_REQUESTED')
      assert.equal(stock, 38)
      assert.ok(order.paymentRequest)
    }
  })

  await t.test('현재 DB에서 관리자 권한 회수 즉시 결제 확인 거부', async () => {
    const created = await createOrder(request(body))
    const { id } = await created.json()
    assert.equal((await deposit(request({}), orderParams(id))).status, 200)
    await db.user.update({ where: { id: fixture }, data: { role: 'USER' } })
    assert.equal((await confirmPayment(request({}), orderParams(id))).status, 403)
    assert.equal((await db.order.findUniqueOrThrow({ where: { id } })).status, 'DEPOSIT_REQUESTED')
  })

  await t.test('PostgreSQL에서 설정 JSON 저장과 버전 충돌 확인', async () => {
    await db.storeSettings.create({ data: { id: settingsId, data: { gapCertified: false, shippingFee: 0 } } })
    const updates = await Promise.all([1000, 3000].map((shippingFee) => db.storeSettings.updateMany({
      where: { id: settingsId, version: 1 }, data: { data: { gapCertified: false, shippingFee }, version: { increment: 1 } },
    })))
    assert.equal(updates.reduce((sum, r) => sum + r.count, 0), 1)
    const row = await db.storeSettings.findUniqueOrThrow({ where: { id: settingsId } })
    assert.equal(row.version, 2)
    assert.equal(row.data.gapCertified, false)
  })
})
