import { transitionOrder, OrderStateConflict } from '@/lib/order-state'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeAuditLogTx } from '@/lib/audit-log'

interface ShipItem {
  orderItemId: string
  carrier: string
  trackingNumber: string
}

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

    const body = await req.json()

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!['PAYMENT_CONFIRMED', 'SHIPPING'].includes(order.status)) {
      return NextResponse.json(
        { error: '결제확인 또는 배송중 상태의 주문만 배송처리할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 신형: { items: [{ orderItemId, carrier, trackingNumber }] }
    // 구형: { carrier, trackingNumber } → 전체 아이템 적용
    let shipItems: ShipItem[]

    if (Array.isArray(body.items)) {
      shipItems = body.items
      if (shipItems.length === 0) {
        return NextResponse.json({ error: '배송할 아이템이 없습니다.' }, { status: 400 })
      }
      for (const si of shipItems) {
        if (!si || typeof si.carrier !== 'string' || !si.carrier.trim() ||
          typeof si.trackingNumber !== 'string' || !si.trackingNumber.trim() ||
          !order.items.some((item) => item.id === si.orderItemId)) {
          return NextResponse.json(
            { error: '각 아이템에 택배사와 송장번호를 입력해주세요.' },
            { status: 400 }
          )
        }
      }
    } else {
      const { carrier, trackingNumber } = body as { carrier?: string; trackingNumber?: string }
      if (typeof carrier !== 'string' || !carrier.trim() || typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
        return NextResponse.json({ error: '택배사와 송장번호를 입력해주세요.' }, { status: 400 })
      }
      shipItems = order.items.map((item) => ({
        orderItemId: item.id,
        carrier,
        trackingNumber,
      }))
    }

    if (new Set(shipItems.map((item) => item.orderItemId)).size !== shipItems.length) {
      return NextResponse.json({ error: '배송 상품이 중복되었습니다.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await transitionOrder(tx, id, order.status, { status: 'SHIPPING' })
      const now = new Date()

      for (const si of shipItems) {
        const orderItem = order.items.find((i) => i.id === si.orderItemId)
        if (!orderItem) continue

        await tx.orderItem.update({
          where: { id: si.orderItemId },
          data: {
            carrier: si.carrier,
            trackingNumber: si.trackingNumber,
            shippedAt: orderItem.shippedAt ?? now,
          },
        })
      }


      await writeAuditLogTx(tx, {
        adminId: session.user.id,
        action: 'ship',
        targetType: 'order',
        targetId: id,
        before: { status: order.status },
        after: { status: 'SHIPPING', items: shipItems },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof OrderStateConflict) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('배송처리 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
