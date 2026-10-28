import { Prisma } from '@prisma/client'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { canConfirmPayment, confirmPayment } from '@/lib/confirm-payment'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await adminAuth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({ where: { id } })

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!canConfirmPayment(order.status)) {
      return NextResponse.json({ error: '입금 대기 또는 입금확인 요청 상태의 주문만 입금완료로 변경할 수 있습니다.' }, { status: 400 })
    }

    if (order.status === 'DRAFT') {
      const body = await req.json().catch(() => null)
      if (body?.manual !== true) {
        return NextResponse.json({ error: '사용자 요청이 없는 주문입니다. 직접 입금 확인 후 처리해주세요.' }, { status: 400 })
      }
    }
    await prisma.$transaction(tx => confirmPayment(tx, order, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: '주문 상태가 변경되었습니다. 새로고침 후 다시 확인해주세요.' }, { status: 409 })
    }
    console.error('입금확인 처리 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
