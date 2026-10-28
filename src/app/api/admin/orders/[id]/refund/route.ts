import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { parseRefund, recordRefund } from '@/lib/admin-cancel'

interface RouteParams {
  params: Promise<{ id: string }>
}

const ERRORS: Record<string, [string, number]> = {
  ORDER_NOT_FOUND: ['주문을 찾을 수 없습니다.', 404],
  REFUND_NOT_REQUIRED: ['입금 후 취소된 주문만 환불 기록을 남길 수 있습니다.', 409],
  REFUND_AMOUNT_EXCEEDED: ['환불 금액이 주문 금액보다 큽니다.', 400],
  ALREADY_REFUNDED: ['이미 환불 기록이 있습니다.', 409],
}

// 관리자가 계좌에서 직접 송금한 환불을 기록 (자동 송금 없음)
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await adminAuth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    const { id } = await params
    const order = await prisma.order.findUnique({ where: { id }, select: { totalAmount: true } })
    if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })

    const input = parseRefund(await req.json().catch(() => null), order.totalAmount)
    if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 })

    const refundedAt = await prisma.$transaction((tx) => recordRefund(tx, id, session.user.id, input))
    return NextResponse.json({ success: true, refundedAt })
  } catch (error) {
    const known = error instanceof Error ? ERRORS[error.message] : undefined
    if (known) return NextResponse.json({ error: known[0] }, { status: known[1] })
    console.error('환불 기록 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
