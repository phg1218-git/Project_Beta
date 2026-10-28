import type { OrderStatus, Prisma } from '@prisma/client'

export const CANCEL_REASON_USER = '사용자 취소'
export const CANCEL_REASON_EXPIRED = '입금기한 경과 — 관리자 미입금 확인 후 취소'

interface CancelTarget {
  id: string
  status: OrderStatus
  items: { productId: string; quantity: number }[]
}

interface CancelOptions {
  reason: string
  // 조건부 갱신에 함께 넣을 추가 조건 (예: 입금기한 기준 createdAt)
  extraWhere?: Pick<Prisma.OrderWhereInput, 'createdAt'>
}

// 상품별 수량 합산 후 productId 순으로 정렬 — 모든 취소 경로가 같은 순서로 잠그도록 함
export function restockPlan(items: CancelTarget['items']) {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity)
  return [...totals.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

// Caller must run this inside a transaction.
// 잠금 순서: order 행 → product 행(productId 오름차순). 주문 상태가 바뀌었으면 P2025로 실패해 재고는 건드리지 않음.
export async function cancelOrderWithRestock(
  tx: Prisma.TransactionClient,
  order: CancelTarget,
  { reason, extraWhere }: CancelOptions,
) {
  if (order.status !== 'DRAFT') throw new Error('INVALID_CANCEL_STATUS')
  await tx.order.update({
    where: { id: order.id, status: order.status, ...extraWhere },
    data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: reason },
  })
  const plan = restockPlan(order.items)
  for (const [productId, quantity] of plan) {
    await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } })
  }
  return plan.reduce((sum, [, quantity]) => sum + quantity, 0)
}
