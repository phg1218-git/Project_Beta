import assert from 'node:assert/strict'
import type { OrderStatus, Prisma } from '@prisma/client'
import { cancelOrderWithRestock, restockPlan } from '../src/lib/cancel-order'

async function main() {
  // 같은 상품 여러 줄은 합산, productId 오름차순으로 잠금
  assert.deepEqual(restockPlan([
    { productId: 'b', quantity: 1 }, { productId: 'a', quantity: 2 }, { productId: 'b', quantity: 3 },
  ]), [['a', 2], ['b', 4]])

  let status: OrderStatus = 'DRAFT'
  const calls: string[] = []
  const stock: Record<string, number> = { a: 0, b: 0 }
  const tx = {
    order: { update: async (arg: { where: { status: OrderStatus; createdAt?: unknown }; data: { status: OrderStatus } }) => {
      calls.push('order')
      if (arg.where.status !== status) throw Object.assign(new Error('P2025'), { code: 'P2025' })
      status = arg.data.status
    } },
    product: { update: async (arg: { where: { id: string }; data: { stock: { increment: number } } }) => {
      calls.push(`product:${arg.where.id}`)
      stock[arg.where.id] += arg.data.stock.increment
    } },
  } as unknown as Prisma.TransactionClient
  const order = { id: 'o1', status: 'DRAFT' as OrderStatus, items: [{ productId: 'b', quantity: 1 }, { productId: 'a', quantity: 2 }] }

  assert.equal(await cancelOrderWithRestock(tx, order, { reason: 'test' }), 3)
  assert.deepEqual(calls, ['order', 'product:a', 'product:b'], 'order must be locked before products')
  assert.deepEqual(stock, { a: 2, b: 1 })

  // 이미 취소된 주문을 다시 취소하면 재고는 그대로
  await assert.rejects(cancelOrderWithRestock(tx, order, { reason: 'test' }), /P2025/)
  assert.deepEqual(stock, { a: 2, b: 1 }, 'stock must be restored exactly once')

  for (const s of ['DEPOSIT_REQUESTED', 'PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELED'] as OrderStatus[]) {
    await assert.rejects(cancelOrderWithRestock({} as Prisma.TransactionClient, { ...order, status: s }, { reason: 'test' }), /INVALID_CANCEL_STATUS/)
  }
  console.log('PASS: restock aggregation/order, order-before-product locking, single restock on duplicate cancel, non-DRAFT guard')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
