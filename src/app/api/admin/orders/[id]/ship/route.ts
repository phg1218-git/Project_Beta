import { Prisma } from '@prisma/client'
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

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: '배송 정보를 입력해주세요.' }, { status: 400 })

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!['PAYMENT_CONFIRMED', 'SHIPPING'].includes(order.status)) {
      return NextResponse.json(
        { error: '입금완료 또는 배송중 상태의 주문만 배송처리할 수 있습니다.' },
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
        if (!si || !si.carrier || !si.trackingNumber) {
          return NextResponse.json(
            { error: '각 아이템에 택배사와 송장번호를 입력해주세요.' },
            { status: 400 }
          )
        }
      }
    } else {
      const { carrier, trackingNumber } = body as { carrier?: string; trackingNumber?: string }
      if (!carrier || !trackingNumber) {
        return NextResponse.json({ error: '택배사와 송장번호를 입력해주세요.' }, { status: 400 })
      }
      shipItems = order.items.map((item) => ({
        orderItemId: item.id,
        carrier,
        trackingNumber,
      }))
    }

    const ids = new Set<string>()
    for (const item of shipItems) {
      if (!item || typeof item.orderItemId !== 'string' || !order.items.some(i => i.id === item.orderItemId) || ids.has(item.orderItemId) ||
          typeof item.carrier !== 'string' || !item.carrier.trim() || item.carrier.length > 50 ||
          typeof item.trackingNumber !== 'string' || !/^[A-Za-z0-9 -]{5,40}$/.test(item.trackingNumber.trim())) {
        return NextResponse.json({ error: '배송 상품, 택배사 또는 송장번호를 확인해주세요.' }, { status: 400 })
      }
      ids.add(item.orderItemId)
      item.carrier = item.carrier.trim()
      item.trackingNumber = item.trackingNumber.replace(/[ -]/g, '')
    }

    await prisma.$transaction(async (tx) => {
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

      await tx.order.update({
        where: { id, status: order.status, updatedAt: order.updatedAt },
        data: { status: 'SHIPPING' },
      })

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: '주문 상태가 변경되었습니다. 새로고침 후 다시 확인해주세요.' }, { status: 409 })
    }
    console.error('배송처리 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
