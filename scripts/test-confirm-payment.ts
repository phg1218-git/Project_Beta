import assert from 'node:assert/strict'
import { complimentaryOrder } from '../src/lib/complimentary-order'
import type { OrderStatus, Prisma } from '@prisma/client'
import { canConfirmPayment, confirmPayment } from '../src/lib/confirm-payment'

async function main() {
  for (const initial of ['DRAFT', 'DEPOSIT_REQUESTED'] as OrderStatus[]) {
    let status = initial
    const writes: { kind: string; data: unknown }[] = []
    const tx = {
      order: { update: async (arg: { where: { status: OrderStatus }; data: { status: OrderStatus } }) => {
        assert.equal(arg.where.status, status, 'stale transition must not be accepted')
        status = arg.data.status
      } },
      paymentRequest: { upsert: async (data: unknown) => { writes.push({ kind: 'confirmation', data }) } },
      adminActionLog: { create: async (data: unknown) => { writes.push({ kind: 'audit', data }) } },
    } as unknown as Prisma.TransactionClient
    await confirmPayment(tx, { id: 'test-order', status: initial }, 'test-admin')
    assert.equal(status, 'PAYMENT_CONFIRMED')
    assert.equal(writes.length, 2)
    assert.match(JSON.stringify(writes[0]), /test-admin/)
    assert.ok(JSON.stringify(writes[1]).includes(`\\"manual\\":${initial === 'DRAFT'}`))
    await assert.rejects(confirmPayment(tx, { id: 'test-order', status: initial }, 'test-admin'))
    assert.equal(writes.length, 2, 'duplicate confirmation must not create more records')
  }
  for (const status of ['CANCELED', 'PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] as OrderStatus[]) {
    assert.equal(canConfirmPayment(status), false)
    await assert.rejects(confirmPayment({} as Prisma.TransactionClient, { id: 'test-order', status }, 'test-admin'), /INVALID_PAYMENT_STATUS/)
  }
  for (const initial of ['DRAFT', 'DEPOSIT_REQUESTED'] as OrderStatus[]) {
    const order = { id: 'gift-order', status: initial, totalAmount: 35000, shippingFee: 3000 }
    let current = { ...order }
    const records: any[] = []
    const tx = {
      order: { update: async ({ where, data }: any) => {
        assert.equal(where.status, current.status)
        assert.equal(where.totalAmount, current.totalAmount)
        assert.equal(where.shippingFee, current.shippingFee)
        current = { ...current, ...data }
        assert.ok(data.paidAt instanceof Date)
      } },
      paymentRequest: { upsert: async (data: any) => { records.push(data) } },
      adminActionLog: { create: async (data: any) => { records.push(data) } },
    } as unknown as Prisma.TransactionClient
    await complimentaryOrder(tx, order, 'gift-admin')
    assert.equal(current.status, 'PAYMENT_CONFIRMED')
    assert.equal(current.totalAmount, 0)
    assert.equal(current.shippingFee, 0)
    assert.equal(records[0].create.confirmedByAdminId, 'gift-admin')
    assert.match(records[0].update.note, /실제 입금 없음/)
    assert.equal(records[1].data.action, 'complimentary')
    assert.equal(JSON.parse(records[1].data.beforeJson).totalAmount, 35000)
    await assert.rejects(complimentaryOrder(tx, order, 'gift-admin'))
    assert.equal(records.length, 2)
  }
  for (const status of ['CANCELED', 'PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] as OrderStatus[]) {
    await assert.rejects(complimentaryOrder({} as Prisma.TransactionClient,
      { id: 'gift-order', status, totalAmount: 35000, shippingFee: 3000 }, 'gift-admin'), /INVALID_PAYMENT_STATUS/)
  }
  console.log('PASS: complimentary order zero total/shipping, audit, duplicate and invalid status guards')
  console.log('PASS: requested/direct payment confirmation, admin audit, stale confirmation rejection, canceled/shipped status guards')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
