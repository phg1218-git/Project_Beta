import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const { orderId, carrier, trackingNumber } = await request.json()

    if (!orderId || !carrier || !trackingNumber) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    })

    if (!order || order.status !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json({ error: '배송 준비 상태의 주문만 처리할 수 있습니다.' }, { status: 400 })
    }

    const now = new Date()

    await prisma.$transaction([
      prisma.orderItem.updateMany({
        where: { orderId },
        data: { carrier, trackingNumber, shippedAt: now },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPING' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('register-shipping error:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
