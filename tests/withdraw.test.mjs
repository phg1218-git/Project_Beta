import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

const load = sourceLoader()
const { withdrawUser } = load('src/lib/withdraw.ts')

function fakeTx({ role = 'USER', active = 0, paidCanceled = [], refunded = 0, orders = 0 } = {}) {
  const calls = []
  const del = (name) => ({ deleteMany: async () => { calls.push(name); return { count: 1 } } })
  return {
    calls,
    $queryRaw: async () => (role ? [{ role }] : []),
    order: {
      count: async ({ where }) => (where.status ? active : orders),
      findMany: async () => paidCanceled.map((id) => ({ id })),
    },
    adminActionLog: {
      count: async () => refunded,
      create: async ({ data }) => { calls.push(['log', JSON.parse(data.afterJson)]) },
    },
    account: del('account'), session: del('session'), cartItem: del('cartItem'), shippingAddress: del('shippingAddress'),
    user: {
      delete: async () => { calls.push('user.delete') },
      update: async ({ data }) => { calls.push(['user.update', data]) },
    },
  }
}

const self = { id: 'u1', by: 'self' }

test('탈퇴 차단: 없는 회원·관리자·진행 중 주문·미환불 주문', async () => {
  await assert.rejects(withdrawUser(fakeTx({ role: null }), 'u1', self), (e) => e.code === 'NOT_FOUND')
  await assert.rejects(withdrawUser(fakeTx({ role: 'ADMIN' }), 'u1', self), (e) => e.code === 'ADMIN')
  await assert.rejects(withdrawUser(fakeTx({ active: 1 }), 'u1', self), (e) => e.code === 'ACTIVE_ORDERS')
  const tx = fakeTx({ paidCanceled: ['o1', 'o2'], refunded: 1 })
  await assert.rejects(withdrawUser(tx, 'u1', self), (e) => e.code === 'REFUND_PENDING')
  assert.equal(tx.calls.length, 0, '차단 시 아무것도 삭제하지 않음')
})

test('주문이 없으면 회원 행까지 삭제', async () => {
  const tx = fakeTx()
  const result = await withdrawUser(tx, 'u1', self)
  assert.equal(result.userDeleted, true)
  assert.ok(tx.calls.includes('user.delete'))
  for (const name of ['account', 'session', 'cartItem', 'shippingAddress']) assert.ok(tx.calls.includes(name))
})

test('주문이 있으면 개인정보만 비우고 주문 연결 유지, 처리 기록 남김', async () => {
  const tx = fakeTx({ orders: 3, paidCanceled: ['o1'], refunded: 1 })
  const result = await withdrawUser(tx, 'u1', { id: 'admin', by: 'admin' })
  assert.equal(result.userDeleted, false)
  assert.equal(result.retainedOrders, 3)
  const [, data] = tx.calls.find((c) => Array.isArray(c) && c[0] === 'user.update')
  for (const key of ['name', 'email', 'image', 'phone', 'addressBase', 'addressDetail']) assert.equal(data[key], null)
  assert.equal(data.profileComplete, false)
  assert.ok(!tx.calls.includes('user.delete'))
  const [, log] = tx.calls.find((c) => Array.isArray(c) && c[0] === 'log')
  assert.equal(log.by, 'admin')
  assert.equal(log.retainedOrders, 3)
})
