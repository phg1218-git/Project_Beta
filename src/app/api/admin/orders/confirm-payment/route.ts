import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const { orderIds } = await request.json()
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 })
    }

    const now = new Date()
    const adminId = session.user.id

    await prisma.$transaction(async (tx) => {
      // DEPOSIT_REQUESTED 상태인 주문만 필터링해서 처리
      const orders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          status: 'DEPOSIT_REQUESTED',
        },
        select: { id: true },
      })

      const validIds = orders.map((o) => o.id)
      if (validIds.length === 0) return

      // 주문 상태를 PAYMENT_CONFIRMED로 변경하고 paidAt 기록
      await tx.order.updateMany({
        where: { id: { in: validIds } },
        data: {
          status: 'PAYMENT_CONFIRMED',
          paidAt: now,
        },
      })

      // PaymentRequest 레코드 confirmedAt, confirmedByAdminId 업데이트
      await tx.paymentRequest.updateMany({
        where: { orderId: { in: validIds } },
        data: {
          confirmedAt: now,
          confirmedByAdminId: adminId,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('confirm-payment error:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
