import type { OrderStatus, Prisma } from '@prisma/client'

// 회원 탈퇴 — 본인 요청(사이트) 또는 관리자 처리(전화·이메일 요청) 공통
// 삭제: 소셜 계정 연결, 세션, 장바구니, 저장 배송지, 프로필(이름·이메일·사진·전화·주소)
// 보존: 주문·주문상품(수령인 정보 스냅샷)·입금 기록 — 전자상거래법 보존 기간 동안
// 주문이 없으면 회원 행 자체를 삭제하고, 있으면 개인정보를 비운 행만 남겨 주문과의 연결을 유지한다.

export const WITHDRAW_BLOCKING_STATUSES: OrderStatus[] = ['DRAFT', 'DEPOSIT_REQUESTED', 'PAYMENT_CONFIRMED', 'SHIPPING']

export type WithdrawBlock = { code: 'ADMIN' | 'ACTIVE_ORDERS' | 'REFUND_PENDING' | 'NOT_FOUND'; message: string }

export const WITHDRAW_MESSAGES: Record<WithdrawBlock['code'], string> = {
  NOT_FOUND: '회원 정보를 찾을 수 없습니다.',
  ADMIN: '관리자 계정은 탈퇴할 수 없습니다. 다른 관리자가 권한을 회수한 뒤 진행해주세요.',
  ACTIVE_ORDERS: '진행 중인 주문이 있어 탈퇴할 수 없습니다. 입금 전 주문은 취소하고, 입금 후 주문은 배송 완료 또는 고객센터 취소 후 탈퇴해주세요.',
  REFUND_PENDING: '환불이 끝나지 않은 주문이 있어 탈퇴할 수 없습니다. 환불이 완료된 뒤 탈퇴해주세요.',
}

export class WithdrawBlockedError extends Error {
  constructor(public code: WithdrawBlock['code']) { super(WITHDRAW_MESSAGES[code]) }
}

export interface WithdrawResult {
  userDeleted: boolean
  retainedOrders: number
  removed: { accounts: number; sessions: number; cartItems: number; shippingAddresses: number }
}

// Caller must run this inside a transaction.
// 회원 행을 FOR UPDATE로 잠근 뒤 진행 중 주문·미환불 주문을 확인한다.
export async function withdrawUser(
  tx: Prisma.TransactionClient,
  userId: string,
  actor: { id: string; by: 'self' | 'admin' },
): Promise<WithdrawResult> {
  const locked = await tx.$queryRaw<{ role: string }[]>`SELECT role FROM "User" WHERE id = ${userId} FOR UPDATE`
  if (!locked[0]) throw new WithdrawBlockedError('NOT_FOUND')
  if (locked[0].role === 'ADMIN') throw new WithdrawBlockedError('ADMIN')

  if (await tx.order.count({ where: { userId, status: { in: WITHDRAW_BLOCKING_STATUSES } } })) {
    throw new WithdrawBlockedError('ACTIVE_ORDERS')
  }
  const paidCanceled = await tx.order.findMany({
    where: { userId, status: 'CANCELED', paidAt: { not: null } },
    select: { id: true },
  })
  if (paidCanceled.length) {
    const refunded = await tx.adminActionLog.count({
      where: { action: 'refund', targetType: 'order', targetId: { in: paidCanceled.map((o) => o.id) } },
    })
    if (refunded < paidCanceled.length) throw new WithdrawBlockedError('REFUND_PENDING')
  }

  const removed = {
    accounts: (await tx.account.deleteMany({ where: { userId } })).count,
    sessions: (await tx.session.deleteMany({ where: { userId } })).count,
    cartItems: (await tx.cartItem.deleteMany({ where: { userId } })).count,
    shippingAddresses: (await tx.shippingAddress.deleteMany({ where: { userId } })).count,
  }
  const retainedOrders = await tx.order.count({ where: { userId } })
  if (retainedOrders === 0) {
    await tx.user.delete({ where: { id: userId } })
  } else {
    await tx.user.update({
      where: { id: userId },
      data: {
        name: null, email: null, emailVerified: null, image: null,
        phone: null, addressBase: null, addressDetail: null, profileComplete: false,
      },
    })
  }

  await tx.adminActionLog.create({ data: {
    adminId: actor.id, action: 'withdraw', targetType: 'user', targetId: userId,
    afterJson: JSON.stringify({ by: actor.by, userDeleted: retainedOrders === 0, retainedOrders, removed }),
  } })
  return { userDeleted: retainedOrders === 0, retainedOrders, removed }
}
