import test from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { sourceLoader } from './load-source.mjs'

function harness({ uniqueConflict = false, shippingFee = 0 } = {}) {
  const address = { id: 'address', userId: 'user', name: '구매자', phone: '01012345678', addressBase: '테스트 배송지', addressDetail: null }
  let stock = 10
  const orders = new Map()
  let deleted = 0
  const findUnique = async ({ where }) => orders.get(where.id) || null
  const tx = {
    order: {
      findUnique,
      create: async ({ data }) => {
        const order = { ...data, items: data.items.create }
        if (uniqueConflict) {
          // 다른 요청이 먼저 커밋한 후 현재 트랜잭션이 PK 충돌을 받은 경로.
          orders.set(data.id, order)
          throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5' })
        }
        orders.set(data.id, order)
        return order
      },
    },
    product: {
      findMany: async () => [{ id: 'product', name: '귤', isActive: true, price: 20000, stock }],
      updateMany: async ({ data }) => { stock -= data.stock.decrement; return { count: 1 } },
    },
    cartItem: { deleteMany: async () => { deleted++ } },
  }
  const prisma = {
    user: { findUnique: async () => ({ id: 'user', name: '구매자', profileComplete: true, shippingAddresses: [address] }) },
    shippingAddress: { findUnique: async () => address },
    order: { findUnique },
    $transaction: async (fn) => fn(tx),
  }
  const load = sourceLoader({
    '@/auth': { auth: async () => ({ user: { id: 'user' } }) },
    '@/lib/prisma': { prisma },
    '@/lib/store-settings': { getStoreSettings: async () => ({ shippingFee, bankAccount: '테스트 계좌' }) },
  })
  const post = load('src/app/api/orders/route.ts').POST
  const purchase = { items: [{ productId: 'product', quantity: 2 }], fromCart: true, cartItemIds: ['cart'] }
  const send = (body = purchase, key = 'test-request-key-1234') => post(new Request('https://shop.example/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body),
  }))
  return { send, purchase, stats: () => ({ stock, orders: orders.size, deleted }) }
}

test('주문 응답 유실 후 같은 키로 재시도하면 기존 주문 반환, 재고는 한 번만 차감', async () => {
  const h = harness()
  const first = await (await h.send()).json()
  const second = await (await h.send()).json()
  assert.equal(first.id, second.id)
  assert.deepEqual(h.stats(), { stock: 8, orders: 1, deleted: 1 })
})

test('배송비는 서버 설정으로 합산하고 주문에 보존', async () => {
  const h = harness({ shippingFee: 3000 })
  const order = await (await h.send()).json()
  assert.equal(order.totalAmount, 43000)
  assert.equal(order.shippingFee, 3000)
})

test('고객이 확인한 배송비가 바뀌면 주문 전에 재확인 요청', async () => {
  const h = harness({ shippingFee: 3000 })
  const response = await h.send({ ...h.purchase, expectedShippingFee: 0 })
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, 'SHIPPING_FEE_CHANGED')
  assert.equal(h.stats().orders, 0)
})

test('같은 키를 다른 수량에 재사용하면 409로 거부', async () => {
  const h = harness()
  await h.send()
  assert.equal((await h.send({ ...h.purchase, items: [{ productId: 'product', quantity: 3 }] })).status, 409)
  assert.equal(h.stats().stock, 8)
})

test('동일 키 동시 생성의 PK 충돌은 먼저 저장된 주문으로 복구', async () => {
  const h = harness({ uniqueConflict: true })
  const response = await h.send()
  assert.equal(response.status, 200)
  assert.equal((await response.json()).items[0].quantity, 2)
  assert.equal(h.stats().deleted, 0)
})

test('배열이 아닌 상품·중복 상품·소수 수량·잘못된 요청 키는 저장 전 거부', async () => {
  const h = harness()
  for (const body of [null, { items: {} }, { items: [null] }, { items: [{ productId: 'product', quantity: 1.5 }] }, { items: [...h.purchase.items, ...h.purchase.items] }]) {
    assert.equal((await h.send(body)).status, 400)
  }
  assert.equal((await h.send(h.purchase, 'bad')).status, 400)
  assert.equal(h.stats().orders, 0)
})
