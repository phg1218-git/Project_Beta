import assert from 'node:assert/strict'
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
  console.log('PASS: requested/direct payment confirmation, admin audit, stale confirmation rejection, canceled/shipped status guards')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
