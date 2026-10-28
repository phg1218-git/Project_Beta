import type { OrderStatus, Prisma } from '@prisma/client'

export function canConfirmPayment(status: OrderStatus) {
  return status === 'DRAFT' || status === 'DEPOSIT_REQUESTED'
}

// Caller must run this inside a transaction: status, confirmation and audit commit together.
export async function confirmPayment(
  tx: Prisma.TransactionClient,
  order: { id: string; status: OrderStatus },
  adminId: string,
) {
  if (!canConfirmPayment(order.status)) throw new Error('INVALID_PAYMENT_STATUS')
  const now = new Date()
  const manual = order.status === 'DRAFT'
  await tx.order.update({
    where: { id: order.id, status: order.status },
    data: { status: 'PAYMENT_CONFIRMED', paidAt: now },
  })
  await tx.paymentRequest.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, confirmedAt: now, confirmedByAdminId: adminId,
      note: manual ? '사용자 입금확인 요청 없이 관리자가 계좌 입금을 확인함' : null },
    update: { confirmedAt: now, confirmedByAdminId: adminId,
      ...(manual && { note: '사용자 입금확인 요청 없이 관리자가 계좌 입금을 확인함' }) },
  })
  await tx.adminActionLog.create({ data: {
    adminId, action: 'confirm-payment', targetType: 'order', targetId: order.id,
    beforeJson: JSON.stringify({ status: order.status }),
    afterJson: JSON.stringify({ status: 'PAYMENT_CONFIRMED', manual, paidAt: now }),
  } })
}
