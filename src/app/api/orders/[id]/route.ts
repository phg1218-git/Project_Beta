import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 주문 상세 조회
export async function GET(req: Request, { params }: RouteParams) {
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
      include: {
        items: { include: { product: true } },
        paymentRequest: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('주문 조회 오류:', error)
    return NextResponse.json(
      { error: '주문 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 주문 취소 (DRAFT 상태만 가능)
export async function DELETE(req: Request, { params }: RouteParams) {
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
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (order.status !== 'DRAFT') {
      return NextResponse.json(
        { error: '입금확인 요청 후에는 주문을 취소할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 트랜잭션으로 주문 취소 + 재고 복구
    await prisma.$transaction(async (tx) => {
      // 재고 복구
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        })
      }

      // 주문 상태 변경
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: '사용자 취소',
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('주문 취소 오류:', error)
    return NextResponse.json(
      { error: '주문 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}