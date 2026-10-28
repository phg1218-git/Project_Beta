import type { OrderStatus, Prisma } from '@prisma/client'
import { restockPlan } from '@/lib/cancel-order'

// 관리자 개별 취소·환불 기록
// - 미입금(DRAFT/DEPOSIT_REQUESTED): 관리자가 계좌에 입금이 없음을 확인한 뒤 취소, 재고 복구
// - 입금완료(PAYMENT_CONFIRMED): 취소 + 재고 복구, 환불 필요
// - 발송 후(SHIPPING/DELIVERED): 취소 + 환불 필요, 재고 복구는 상품 상태를 보고 관리자가 선택
// 환불 송금은 관리자가 계좌에서 직접 하고, 사이트에는 금액·메모만 기록한다(자동 송금 없음).

export const ADMIN_CANCEL_REASON_MAX = 200
export const REFUND_NOTE_MAX = 200

const UNPAID: OrderStatus[] = ['DRAFT', 'DEPOSIT_REQUESTED']
const PAID: OrderStatus[] = ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED']

export function canAdminCancel(status: OrderStatus) {
  return UNPAID.includes(status) || PAID.includes(status)
}

export function isPaidStatus(status: OrderStatus) {
  return PAID.includes(status)
}

// 발송 전 주문은 재고를 항상 되돌리고, 발송 후에는 관리자 선택에 따름
export function restockDecision(status: OrderStatus, requested: boolean) {
  return status === 'SHIPPING' || status === 'DELIVERED' ? requested : true
}

export interface AdminCancelInput {
  reason: string
  restock: boolean
  // 미입금 주문: 실제 계좌에 입금이 없음을 확인
  confirmedNoDeposit: boolean
}

// 요청 본문 검증. 오류 시 사용자에게 보여줄 메시지를 반환
export function parseAdminCancel(body: unknown, status: OrderStatus): AdminCancelInput | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '잘못된 요청 형식입니다.'
  const { reason, restock, confirmedNoDeposit, expectedStatus } = body as Record<string, unknown>
  if (expectedStatus !== status) return '주문 상태가 변경되었습니다. 새로고침 후 다시 확인해주세요.'
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > ADMIN_CANCEL_REASON_MAX) {
    return `취소 사유를 1~${ADMIN_CANCEL_REASON_MAX}자로 입력해주세요.`
  }
  if (restock !== undefined && typeof restock !== 'boolean') return '재고 복구 여부를 확인해주세요.'
  if (UNPAID.includes(status) && confirmedNoDeposit !== true) {
    return '계좌에 입금이 없음을 확인해주세요. 입금이 있었다면 먼저 입금완료 처리 후 취소해주세요.'
  }
  return { reason: reason.trim(), restock: restock === true, confirmedNoDeposit: confirmedNoDeposit === true }
}

interface CancelTarget {
  id: string
  status: OrderStatus
  totalAmount: number
  items: { productId: string; quantity: number }[]
}

// Caller must run this inside a transaction. 잠금 순서: order → product(productId 오름차순)
// 상태가 이미 바뀌었으면 P2025로 실패해 재고·기록은 남지 않음
export async function adminCancelOrder(
  tx: Prisma.TransactionClient,
  order: CancelTarget,
  adminId: string,
  input: AdminCancelInput,
) {
  if (!canAdminCancel(order.status)) throw new Error('INVALID_CANCEL_STATUS')
  const now = new Date()
  const restock = restockDecision(order.status, input.restock)
  const refundRequired = isPaidStatus(order.status)
  await tx.order.update({
    where: { id: order.id, status: order.status },
    data: { status: 'CANCELED', canceledAt: now, cancelReason: `관리자 취소 — ${input.reason}` },
  })
  const plan = restock ? restockPlan(order.items) : []
  for (const [productId, quantity] of plan) {
    await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } })
  }
  const restoredStock = plan.reduce((sum, [, quantity]) => sum + quantity, 0)
  await tx.adminActionLog.create({ data: {
    adminId, action: 'admin-cancel', targetType: 'order', targetId: order.id,
    beforeJson: JSON.stringify({ status: order.status, totalAmount: order.totalAmount }),
    afterJson: JSON.stringify({
      status: 'CANCELED', reason: input.reason, canceledAt: now, restoredStock,
      refundRequired, refundAmount: refundRequired ? order.totalAmount : 0,
      ...(!refundRequired && { confirmedNoDeposit: true }),
    }),
  } })
  return { restoredStock, refundRequired }
}

export interface RefundRecord { amount: number; note: string; refundedAt: string; adminId: string }

export function parseRefund(body: unknown, totalAmount: number): { amount: number; note: string } | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '잘못된 요청 형식입니다.'
  const { amount, note, confirmedTransfer } = body as Record<string, unknown>
  if (confirmedTransfer !== true) return '고객 계좌로 실제 송금했는지 확인해주세요.'
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > totalAmount) {
    return `환불 금액은 1~${totalAmount.toLocaleString()}원 사이의 정수로 입력해주세요.`
  }
  if (note !== undefined && (typeof note !== 'string' || note.trim().length > REFUND_NOTE_MAX)) {
    return `메모는 ${REFUND_NOTE_MAX}자 이내로 입력해주세요.`
  }
  return { amount, note: typeof note === 'string' ? note.trim() : '' }
}

export function readRefund(log: { adminId: string; afterJson: string | null; createdAt: Date } | null): RefundRecord | null {
  if (!log) return null
  try {
    const data = JSON.parse(log.afterJson ?? '{}') as { amount?: unknown; note?: unknown }
    return {
      amount: typeof data.amount === 'number' ? data.amount : 0,
      note: typeof data.note === 'string' ? data.note : '',
      refundedAt: log.createdAt.toISOString(),
      adminId: log.adminId,
    }
  } catch {
    return { amount: 0, note: '', refundedAt: log.createdAt.toISOString(), adminId: log.adminId }
  }
}

export const refundLogWhere = (orderId: string) => ({ action: 'refund', targetType: 'order', targetId: orderId })

// Caller must run this inside a transaction.
// 주문 행을 FOR UPDATE로 잠근 뒤 기존 환불 기록을 확인해 동시 요청에도 1건만 남긴다.
export async function recordRefund(
  tx: Prisma.TransactionClient,
  orderId: string,
  adminId: string,
  input: { amount: number; note: string },
) {
  const locked = await tx.$queryRaw<{ status: OrderStatus; paidAt: Date | null; totalAmount: number }[]>`
    SELECT status, "paidAt", "totalAmount" FROM "Order" WHERE id = ${orderId} FOR UPDATE`
  const order = locked[0]
  if (!order) throw new Error('ORDER_NOT_FOUND')
  if (order.status !== 'CANCELED' || !order.paidAt) throw new Error('REFUND_NOT_REQUIRED')
  if (input.amount > order.totalAmount) throw new Error('REFUND_AMOUNT_EXCEEDED')
  if (await tx.adminActionLog.findFirst({ where: refundLogWhere(orderId), select: { id: true } })) {
    throw new Error('ALREADY_REFUNDED')
  }
  const now = new Date()
  await tx.adminActionLog.create({ data: {
    adminId, ...refundLogWhere(orderId),
    beforeJson: JSON.stringify({ status: order.status, totalAmount: order.totalAmount }),
    afterJson: JSON.stringify({ amount: input.amount, note: input.note, refundedAt: now }),
  } })
  return now
}
