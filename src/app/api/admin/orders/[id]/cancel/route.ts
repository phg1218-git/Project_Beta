import { Prisma } from '@prisma/client'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { adminCancelOrder, canAdminCancel, parseAdminCancel } from '@/lib/admin-cancel'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 관리자 개별 주문 취소 — 사유·처리자·시각·재고 복구·환불 필요 여부를 기록
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await adminAuth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json().catch(() => null)

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { select: { productId: true, quantity: true } } },
    })
    if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    if (!canAdminCancel(order.status)) {
      return NextResponse.json({ error: '이미 취소된 주문입니다.' }, { status: 409 })
    }

    const input = parseAdminCancel(body, order.status)
    if (typeof input === 'string') {
      const conflict = (body as { expectedStatus?: unknown } | null)?.expectedStatus !== order.status
      return NextResponse.json({ error: input }, { status: conflict ? 409 : 400 })
    }

    const result = await prisma.$transaction((tx) => adminCancelOrder(tx, order, session.user.id, input))
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: '주문 상태가 변경되었습니다. 새로고침 후 다시 확인해주세요.' }, { status: 409 })
    }
    console.error('관리자 주문 취소 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
