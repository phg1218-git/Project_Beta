import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 배송 정보 조회
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 본인 주문만 조회 가능
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: session.user.id,
        // 결제 확인 이후 상태만 배송 정보 조회 가능
        status: {
          in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'],
        },
      },
      include: {
        items: {
          select: {
            id: true,
            recipientName: true,
            recipientPhone: true,
            recipientAddressBase: true,
            recipientAddressDetail: true,
            trackingNumber: true,
            carrier: true,
            shippedAt: true,
            deliveredAt: true,
            product: {
              select: { name: true },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없거나 배송 정보를 조회할 수 없는 상태입니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      items: order.items,
    })
  } catch (error) {
    console.error('배송 정보 조회 오류:', error)
    return NextResponse.json(
      { error: '배송 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
