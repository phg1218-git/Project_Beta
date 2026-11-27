import type { OrderStatus, Prisma } from '@prisma/client'
import { canConfirmPayment } from './confirm-payment'

// Run inside a transaction so the amount, status and audit record change together.
export async function complimentaryOrder(
  tx: Prisma.TransactionClient,
  order: { id: string; status: OrderStatus; totalAmount: number; shippingFee: number },
  adminId: string,
) {
  if (!canConfirmPayment(order.status)) throw new Error('INVALID_PAYMENT_STATUS')
  const now = new Date()
  await tx.order.update({
    where: { id: order.id, status: order.status, totalAmount: order.totalAmount, shippingFee: order.shippingFee },
    data: { status: 'PAYMENT_CONFIRMED', totalAmount: 0, shippingFee: 0, paidAt: now },
  })
  await tx.paymentRequest.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, confirmedAt: now, confirmedByAdminId: adminId, note: '관리자 증정처리 (실제 입금 없음)' },
    update: { confirmedAt: now, confirmedByAdminId: adminId, note: '관리자 증정처리 (실제 입금 없음)' },
  })
  await tx.adminActionLog.create({ data: {
    adminId, action: 'complimentary', targetType: 'order', targetId: order.id,
    beforeJson: JSON.stringify({ status: order.status, totalAmount: order.totalAmount, shippingFee: order.shippingFee }),
    afterJson: JSON.stringify({ status: 'PAYMENT_CONFIRMED', totalAmount: 0, shippingFee: 0, paidAt: now }),
  } })
}
