import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeAuditLogTx } from '@/lib/audit-log'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (order.status !== 'SHIPPING') {
      return NextResponse.json(
        { error: '배송중 상태의 주문만 완료처리할 수 있습니다.' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { deliveredAt: now },
      })

      await tx.order.update({
        where: { id },
        data: { status: 'DELIVERED' },
      })

      await writeAuditLogTx(tx, {
        adminId: session.user.id,
        action: 'delivered',
        targetType: 'order',
        targetId: id,
        before: { status: order.status },
        after: { status: 'DELIVERED' },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('배송완료 처리 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
