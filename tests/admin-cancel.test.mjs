import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

const load = sourceLoader()
const { parseAdminCancel, parseRefund, restockDecision, adminCancelOrder, recordRefund, readRefund } = load('src/lib/admin-cancel.ts')

function fakeTx({ locked = [], existingRefund = null } = {}) {
  const calls = []
  return {
    calls,
    order: { update: async (args) => { calls.push(['order.update', args]) } },
    product: { update: async (args) => { calls.push(['product.update', args]) } },
    adminActionLog: {
      create: async (args) => { calls.push(['log.create', args]) },
      findFirst: async () => existingRefund,
    },
    $queryRaw: async () => locked,
  }
}

test('관리자 취소 입력: 상태 확인·사유 길이·미입금 확인 필수', () => {
  assert.match(parseAdminCancel({ expectedStatus: 'DRAFT', reason: '미입금' }, 'DEPOSIT_REQUESTED'), /상태가 변경/)
  assert.match(parseAdminCancel({ expectedStatus: 'DRAFT', reason: '  ' }, 'DRAFT'), /사유/)
  assert.match(parseAdminCancel({ expectedStatus: 'DRAFT', reason: 'x'.repeat(201) }, 'DRAFT'), /사유/)
  assert.match(parseAdminCancel({ expectedStatus: 'DEPOSIT_REQUESTED', reason: '미입금' }, 'DEPOSIT_REQUESTED'), /입금이 없음/)
  assert.match(parseAdminCancel({ expectedStatus: 'SHIPPING', reason: '회수', restock: 'yes' }, 'SHIPPING'), /재고/)
  assert.deepEqual(parseAdminCancel({ expectedStatus: 'PAYMENT_CONFIRMED', reason: ' 재고 부족 ' }, 'PAYMENT_CONFIRMED'),
    { reason: '재고 부족', restock: false, confirmedNoDeposit: false })
  assert.equal(parseAdminCancel(null, 'DRAFT'), '잘못된 요청 형식입니다.')
})

test('재고 복구: 발송 전은 항상, 발송 후는 관리자 선택', () => {
  for (const s of ['DRAFT', 'DEPOSIT_REQUESTED', 'PAYMENT_CONFIRMED']) assert.equal(restockDecision(s, false), true)
  for (const s of ['SHIPPING', 'DELIVERED']) {
    assert.equal(restockDecision(s, false), false)
    assert.equal(restockDecision(s, true), true)
  }
})

test('입금완료 주문 취소: 조건부 상태 갱신 → 상품순 재고 복구 → 환불 필요 기록', async () => {
  const tx = fakeTx()
  const order = { id: 'o1', status: 'PAYMENT_CONFIRMED', totalAmount: 43000, items: [
    { productId: 'b', quantity: 1 }, { productId: 'a', quantity: 2 }, { productId: 'b', quantity: 3 },
  ] }
  const result = await adminCancelOrder(tx, order, 'admin', { reason: '고객 요청', restock: false, confirmedNoDeposit: false })
  assert.deepEqual(result, { restoredStock: 6, refundRequired: true })
  assert.equal(tx.calls[0][0], 'order.update')
  assert.deepEqual(tx.calls[0][1].where, { id: 'o1', status: 'PAYMENT_CONFIRMED' })
  assert.equal(tx.calls[0][1].data.cancelReason, '관리자 취소 — 고객 요청')
  assert.deepEqual(tx.calls.filter(([k]) => k === 'product.update').map(([, a]) => [a.where.id, a.data.stock.increment]), [['a', 2], ['b', 4]])
  const log = JSON.parse(tx.calls.at(-1)[1].data.afterJson)
  assert.equal(log.refundAmount, 43000)
  assert.equal(log.refundRequired, true)
})

test('배송완료 주문 취소: 재고 복구 미선택이면 재고를 건드리지 않음', async () => {
  const tx = fakeTx()
  const order = { id: 'o2', status: 'DELIVERED', totalAmount: 10000, items: [{ productId: 'a', quantity: 1 }] }
  const result = await adminCancelOrder(tx, order, 'admin', { reason: '부패', restock: false, confirmedNoDeposit: false })
  assert.deepEqual(result, { restoredStock: 0, refundRequired: true })
  assert.equal(tx.calls.filter(([k]) => k === 'product.update').length, 0)
})

test('이미 취소된 주문은 다시 취소하지 않음', async () => {
  await assert.rejects(adminCancelOrder(fakeTx(), { id: 'o', status: 'CANCELED', totalAmount: 1, items: [] }, 'a',
    { reason: 'x', restock: true, confirmedNoDeposit: true }), /INVALID_CANCEL_STATUS/)
})

test('환불 입력: 송금 확인·금액 범위·메모 길이', () => {
  assert.match(parseRefund({ amount: 1000 }, 5000), /송금/)
  assert.match(parseRefund({ amount: 5001, confirmedTransfer: true }, 5000), /환불 금액/)
  assert.match(parseRefund({ amount: 10.5, confirmedTransfer: true }, 5000), /환불 금액/)
  assert.match(parseRefund({ amount: 100, confirmedTransfer: true, note: 'x'.repeat(201) }, 5000), /메모/)
  assert.deepEqual(parseRefund({ amount: 5000, confirmedTransfer: true, note: ' 송금 ' }, 5000), { amount: 5000, note: '송금' })
})

test('환불 기록: 입금 후 취소된 주문에 1회만', async () => {
  const paid = [{ status: 'CANCELED', paidAt: new Date(), totalAmount: 5000 }]
  await assert.rejects(recordRefund(fakeTx({ locked: [] }), 'o', 'a', { amount: 1, note: '' }), /ORDER_NOT_FOUND/)
  await assert.rejects(recordRefund(fakeTx({ locked: [{ ...paid[0], paidAt: null }] }), 'o', 'a', { amount: 1, note: '' }), /REFUND_NOT_REQUIRED/)
  await assert.rejects(recordRefund(fakeTx({ locked: [{ ...paid[0], status: 'SHIPPING' }] }), 'o', 'a', { amount: 1, note: '' }), /REFUND_NOT_REQUIRED/)
  await assert.rejects(recordRefund(fakeTx({ locked: paid, existingRefund: { id: 'l' } }), 'o', 'a', { amount: 1, note: '' }), /ALREADY_REFUNDED/)
  await assert.rejects(recordRefund(fakeTx({ locked: paid }), 'o', 'a', { amount: 5001, note: '' }), /REFUND_AMOUNT_EXCEEDED/)
  const tx = fakeTx({ locked: paid })
  await recordRefund(tx, 'o', 'a', { amount: 5000, note: '메모' })
  const created = tx.calls.find(([k]) => k === 'log.create')[1].data
  assert.equal(created.action, 'refund')
  assert.equal(created.targetId, 'o')
  assert.equal(readRefund({ ...created, createdAt: new Date() }).amount, 5000)
})
