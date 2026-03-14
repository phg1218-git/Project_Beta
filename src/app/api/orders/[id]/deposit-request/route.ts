import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 입금확인 요청
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const order = await prisma.order.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (order.status !== 'DRAFT') {
      return NextResponse.json(
        { error: '이미 입금확인 요청이 완료된 주문입니다.' },
        { status: 400 }
      )
    }

    // 트랜잭션으로 상태 변경 + PaymentRequest 생성
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: 'DEPOSIT_REQUESTED',
          requestedDepositAt: new Date(),
        },
      })

      await tx.paymentRequest.create({
        data: {
          orderId: id,
          requestedAt: new Date(),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('입금확인 요청 오류:', error)
    return NextResponse.json(
      { error: '입금확인 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
