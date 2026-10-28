import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { sourceLoader } from '../load-source.mjs'

// 반드시 scripts/test-integration.mjs(npm run test:integration)로 실행한다.
// 실행기는 TEST_DATABASE_URL이 운영(.env.local)과 다른 DB일 때만 이 파일을 실행한다.
if (process.env.DEV_DB_TEST_ALLOWED !== 'true') {
  throw new Error('npm run test:integration으로 실행해주세요.')
}

test('분리된 PostgreSQL에서 주문·재고·입금·만료 경쟁 검증', { timeout: 180000 }, async (t) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
  const fixture = `integration_${randomUUID()}`
  const productId = `${fixture}_product`
  const settingsId = `${fixture}_settings`
  const request = (body, key = randomUUID()) => new Request('http://localhost/api/test', {
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
    '@/auth': { auth: async () => ({ user: { id: fixture, role: 'ADMIN', profileComplete: true } }) },
    '@/lib/store-settings': { getStoreSettings: async () => ({ shippingFee: 3000, bankAccount: '통합 테스트 전용 계좌' }) },
  })
  const createOrder = load('src/app/api/orders/route.ts').POST
  const cancelOrder = load('src/app/api/orders/[id]/route.ts').DELETE
  const deposit = load('src/app/api/orders/[id]/deposit-request/route.ts').POST
  const confirmPayment = load('src/app/api/admin/orders/[id]/confirm-payment/route.ts').POST
  const expire = load('src/app/api/admin/orders/expire/route.ts').POST
  const adminCancel = load('src/app/api/admin/orders/[id]/cancel/route.ts').POST
  const refund = load('src/app/api/admin/orders/[id]/refund/route.ts').POST
  const withdrawSelf = load('src/app/api/profile/withdraw/route.ts').POST
  const stock = async () => (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock
  const newOrder = async () => {
    const res = await createOrder(request(body))
    assert.equal(res.status, 201)
    return (await res.json()).id
  }
  const makeOverdue = (id) => db.order.update({ where: { id }, data: { createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } })

  t.after(async () => {
    try {
      // 이 실행에서 만든 식별자만 정리한다.
      await db.adminActionLog.deleteMany({ where: { adminId: fixture } })
      await db.order.deleteMany({ where: { userId: { startsWith: fixture } } })
      await db.user.deleteMany({ where: { id: { startsWith: fixture + '_' } } })
      await db.order.deleteMany({ where: { userId: fixture } })
      await db.user.deleteMany({ where: { id: fixture } })
      await db.product.deleteMany({ where: { id: productId } })
      await db.storeSettings.deleteMany({ where: { id: settingsId } })
    } finally { await db.$disconnect() }
  })

  await db.user.create({ data: {
    id: fixture, name: '통합테스트', role: 'ADMIN', profileComplete: true,
    shippingAddresses: { create: { name: '통합테스트', phone: '01000000000', addressBase: '테스트 전용 주소', isDefault: true } },
  } })
  await db.product.create({ data: { id: productId, name: '통합 테스트 귤', description: '실판매 아님', price: 20000, stock: 40 } })

  let orderId
  await t.test('동일 요청 키 4개 동시 전송 → 주문 1건, 재고 차감 1회', async () => {
    const key = randomUUID()
    const responses = await Promise.all(Array.from({ length: 4 }, () => createOrder(request(body, key))))
    assert.ok(responses.every((r) => r.ok), `응답 코드: ${responses.map((r) => r.status)}`)
    const orders = await Promise.all(responses.map((r) => r.json()))
    orderId = orders[0].id
    assert.equal(new Set(orders.map((o) => o.id)).size, 1)
    assert.equal(await db.order.count({ where: { userId: fixture } }), 1)
    assert.equal(await stock(), 38)
    assert.equal(orders[0].shippingFee, 3000)
    assert.equal(orders[0].totalAmount, 43000)
  })

  await t.test('동시 사용자 취소 → 재고 복구 1회', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => cancelOrder(request({}), orderParams(orderId))))
    assert.equal(responses.filter((r) => r.ok).length, 1)
    assert.ok(responses.every((r) => [200, 400, 409].includes(r.status)), `응답 코드: ${responses.map((r) => r.status)}`)
    assert.equal(await stock(), 40)
  })

  await t.test('입금요청 ↔ 사용자 취소 경쟁 → 한 상태만 반영', async () => {
    const id = await newOrder()
    const responses = await Promise.all([deposit(request({}), orderParams(id)), cancelOrder(request({}), orderParams(id))])
    assert.equal(responses.filter((r) => r.ok).length, 1)
    const order = await db.order.findUniqueOrThrow({ where: { id } })
    if (order.status === 'CANCELED') assert.equal(await stock(), 40)
    else {
      assert.equal(order.status, 'DEPOSIT_REQUESTED')
      assert.equal(await stock(), 38)
      await db.order.update({ where: { id }, data: { status: 'CANCELED' } })
      await db.product.update({ where: { id: productId }, data: { stock: 40 } })
    }
  })

  await t.test('기한 경과 취소 ↔ 관리자 직접 입금확인 경쟁 → 한쪽만 성공, 결제기록/재고 일관', async () => {
    const id = await newOrder()
    await makeOverdue(id)
    const [expired, confirmed] = await Promise.all([
      expire(request({ orderIds: [id], confirmedNoDeposit: true })),
      confirmPayment(request({ manual: true }), orderParams(id)),
    ])
    const expireResult = await expired.json()
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { paymentRequest: true } })
    if (order.status === 'CANCELED') {
      assert.deepEqual(expireResult.canceled, [id])
      assert.notEqual(confirmed.status, 200)
      assert.equal(order.paymentRequest, null, '취소된 주문에 결제기록이 남으면 안 됨')
      assert.equal(await stock(), 40)
    } else {
      assert.equal(order.status, 'PAYMENT_CONFIRMED')
      assert.equal(confirmed.status, 200)
      assert.deepEqual(expireResult.canceled, [])
      assert.ok(order.paymentRequest?.confirmedAt)
      assert.equal(await stock(), 38)
      await db.order.update({ where: { id }, data: { status: 'CANCELED' } })
      await db.product.update({ where: { id: productId }, data: { stock: 40 } })
    }
  })

  await t.test('기한 경과 취소는 입금확인 요청 주문·기한 전 주문을 건드리지 않음', async () => {
    const requested = await newOrder()
    await makeOverdue(requested)
    assert.equal((await deposit(request({}), orderParams(requested))).status, 200)
    const fresh = await newOrder()
    const res = await expire(request({ orderIds: [requested, fresh], confirmedNoDeposit: true }))
    const result = await res.json()
    assert.deepEqual(result.canceled, [])
    assert.equal(result.skipped.length, 2)
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: requested } })).status, 'DEPOSIT_REQUESTED')
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: fresh } })).status, 'DRAFT')
    assert.equal(await stock(), 36)
    // 다음 단계를 위해 정리
    assert.equal((await cancelOrder(request({}), orderParams(fresh))).status, 200)
    await db.order.update({ where: { id: requested }, data: { status: 'CANCELED' } })
    await db.product.update({ where: { id: productId }, data: { stock: 40 } })
  })

  await t.test('동시 주문 경쟁 → 재고 초과 판매 없음', async () => {
    await db.product.update({ where: { id: productId }, data: { stock: 5 } })
    const responses = await Promise.all(Array.from({ length: 6 }, () => createOrder(request(body))))
    const ok = responses.filter((r) => r.status === 201).length
    assert.equal(ok, 2)
    assert.ok(responses.every((r) => [201, 409].includes(r.status)), `응답 코드: ${responses.map((r) => r.status)}`)
    assert.equal(await stock(), 1)
  })

  await t.test('DB에서 관리자 권한 회수 즉시 입금확인 거부', async () => {
    await db.product.update({ where: { id: productId }, data: { stock: 40 } })
    const id = await newOrder()
    assert.equal((await deposit(request({}), orderParams(id))).status, 200)
    await db.user.update({ where: { id: fixture }, data: { role: 'USER' } })
    assert.equal((await confirmPayment(request({}), orderParams(id))).status, 403)
    assert.equal((await db.order.findUniqueOrThrow({ where: { id } })).status, 'DEPOSIT_REQUESTED')
    await db.user.update({ where: { id: fixture }, data: { role: 'ADMIN' } })
  })

  await t.test('관리자 취소 ↔ 사용자 취소 경쟁 → 재고 복구 1회', async () => {
    await db.product.update({ where: { id: productId }, data: { stock: 40 } })
    const id = await newOrder()
    const responses = await Promise.all([
      adminCancel(request({ expectedStatus: 'DRAFT', reason: '미입금', confirmedNoDeposit: true }), orderParams(id)),
      cancelOrder(request({}), orderParams(id)),
    ])
    assert.equal(responses.filter((r) => r.ok).length, 1, `응답 코드: ${responses.map((r) => r.status)}`)
    assert.equal(await stock(), 40)
  })

  await t.test('입금완료 주문 관리자 취소 동시 2회 → 1회만, 환불 기록 동시 2회 → 1건만', async () => {
    const id = await newOrder()
    assert.equal((await confirmPayment(request({ manual: true }), orderParams(id))).status, 200)
    const cancels = await Promise.all(Array.from({ length: 2 }, () =>
      adminCancel(request({ expectedStatus: 'PAYMENT_CONFIRMED', reason: '고객 요청' }), orderParams(id))))
    assert.equal(cancels.filter((r) => r.ok).length, 1, `응답 코드: ${cancels.map((r) => r.status)}`)
    assert.equal(await stock(), 40)
    const refunds = await Promise.all(Array.from({ length: 2 }, () =>
      refund(request({ amount: 43000, confirmedTransfer: true }), orderParams(id))))
    assert.equal(refunds.filter((r) => r.ok).length, 1, `응답 코드: ${refunds.map((r) => r.status)}`)
    assert.equal(await db.adminActionLog.count({ where: { action: 'refund', targetId: id } }), 1)
  })

  await t.test('회원 탈퇴: 관리자 거부, 주문 있는 회원은 개인정보만 비우고 주문 보존, 주문 없는 회원은 삭제', async () => {
    assert.equal((await withdrawSelf(request({ confirmed: true }))).status, 409, '관리자 계정은 탈퇴 불가')
    const { withdrawUser } = load('src/lib/withdraw.ts')
    const plain = `${fixture}_plain`
    const buyer = `${fixture}_buyer`
    for (const id of [plain, buyer]) {
      await db.user.create({ data: { id, name: '탈퇴테스트', email: `${id}@example.invalid`, phone: '01000000000', profileComplete: true,
        shippingAddresses: { create: { name: '탈퇴테스트', phone: '01000000000', addressBase: '테스트 주소' } } } })
    }
    const order = await db.order.create({ data: { userId: buyer, status: 'DELIVERED', totalAmount: 1000, items: { create: {
      productId, quantity: 1, unitPrice: 1000, recipientName: '탈퇴테스트', recipientPhone: '01000000000', recipientAddressBase: '테스트 주소' } } } })
    await db.order.update({ where: { id: order.id }, data: { status: 'SHIPPING' } })
    await assert.rejects(db.$transaction((tx) => withdrawUser(tx, buyer, { id: fixture, by: 'admin' })), (e) => e.code === 'ACTIVE_ORDERS')
    await db.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } })

    const kept = await db.$transaction((tx) => withdrawUser(tx, buyer, { id: fixture, by: 'admin' }))
    assert.equal(kept.userDeleted, false)
    const anonymized = await db.user.findUniqueOrThrow({ where: { id: buyer } })
    assert.equal(anonymized.email, null)
    assert.equal(anonymized.phone, null)
    assert.equal(await db.shippingAddress.count({ where: { userId: buyer } }), 0)
    assert.equal((await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).recipientName, '탈퇴테스트', '주문 스냅샷 보존')

    const gone = await db.$transaction((tx) => withdrawUser(tx, plain, { id: fixture, by: 'admin' }))
    assert.equal(gone.userDeleted, true)
    assert.equal(await db.user.count({ where: { id: plain } }), 0)
    await db.order.deleteMany({ where: { userId: buyer } })
    await db.user.deleteMany({ where: { id: buyer } })
  })

  await t.test('설정 JSON 저장과 버전 충돌', async () => {
    await db.storeSettings.create({ data: { id: settingsId, data: { shippingFee: 0 } } })
    const updates = await Promise.all([1000, 3000].map((shippingFee) => db.storeSettings.updateMany({
      where: { id: settingsId, version: 1 }, data: { data: { shippingFee }, version: { increment: 1 } },
    })))
    assert.equal(updates.reduce((sum, r) => sum + r.count, 0), 1)
    assert.equal((await db.storeSettings.findUniqueOrThrow({ where: { id: settingsId } })).version, 2)
  })
})
