import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { writeAuditLogTx } from '@/lib/audit-log'
import {
  buildShippingWorkbook, parseTrackingWorkbook,
  MAX_SHIPPING_FILE_BYTES, MAX_SHIPPING_ROWS, type TrackingEntry,
} from '@/lib/shipping-sheet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!await adminAuth()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    const items = await prisma.orderItem.findMany({
      where: { shippedAt: null, order: { status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING'] } } },
      select: {
        id: true, quantity: true, recipientName: true, recipientPhone: true,
        recipientAddressBase: true, recipientAddressDetail: true,
        product: { select: { name: true } },
        order: {
          select: {
            id: true, createdAt: true, depositorName: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ order: { createdAt: 'asc' } }, { id: 'asc' }],
      take: MAX_SHIPPING_ROWS + 1,
    })
    if (items.length > MAX_SHIPPING_ROWS) {
      return NextResponse.json({ error: '미발송 상품이 1,000행을 넘습니다. 먼저 일부를 처리한 후 다시 내려받아 주세요.' }, { status: 413 })
    }
    const buffer = await buildShippingWorkbook(items.map((item) => ({
      orderId: item.order.id,
      itemId: item.id,
      orderedAt: item.order.createdAt,
      buyerName: item.order.user.name || '',
      depositorName: item.order.depositorName || '',
      productName: item.product.name,
      quantity: item.quantity,
      recipientName: item.recipientName,
      recipientPhone: item.recipientPhone,
      addressBase: item.recipientAddressBase,
      addressDetail: item.recipientAddressDetail || '',
    })))
    const date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '')
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="shipping-${date}.xlsx"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[ShippingSheet] 내려받기 실패:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: '배송 목록을 만들지 못했습니다.' }, { status: 500 })
  }
}

async function validateEntries(entries: TrackingEntry[]) {
  const items = await prisma.orderItem.findMany({
    where: { id: { in: entries.map((entry) => entry.itemId) } },
    select: {
      id: true, orderId: true, carrier: true, trackingNumber: true, shippedAt: true,
      order: { select: { status: true } },
    },
  })
  const byId = new Map(items.map((item) => [item.id, item]))
  const errors: string[] = []
  let skipped = 0
  const ready: TrackingEntry[] = []
  for (const entry of entries) {
    const item = byId.get(entry.itemId)
    if (!item || item.orderId !== entry.orderId) {
      errors.push(`${entry.rowNumber}행: 주문과 배송상품ID가 일치하지 않습니다.`)
    } else if (!['PAYMENT_CONFIRMED', 'SHIPPING'].includes(item.order.status)) {
      errors.push(`${entry.rowNumber}행: 입금완료 또는 배송중 주문이 아닙니다.`)
    } else if (item.shippedAt || item.trackingNumber) {
      if (item.carrier === entry.carrier && item.trackingNumber === entry.trackingNumber) skipped++
      else errors.push(`${entry.rowNumber}행: 이미 등록된 송장이 있습니다. 개별 주문에서 수정해주세요.`)
    } else {
      ready.push(entry)
    }
  }
  return { ready, skipped, errors }
}

export async function POST(req: Request) {
  try {
    const session = await adminAuth()
    if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    if (Number(req.headers.get('content-length')) > MAX_SHIPPING_FILE_BYTES + 65536) {
      return NextResponse.json({ error: '엑셀 파일은 2MB 이하여야 합니다.' }, { status: 413 })
    }
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx') || file.size > MAX_SHIPPING_FILE_BYTES) {
      return NextResponse.json({ error: '2MB 이하의 .xlsx 파일을 선택해주세요.' }, { status: 400 })
    }
    let entries: TrackingEntry[]
    try {
      entries = await parseTrackingWorkbook(Buffer.from(await file.arrayBuffer()))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '엑셀 파일을 읽지 못했습니다.' }, { status: 400 })
    }
    if (entries.length > 200) {
      return NextResponse.json({ error: '송장번호는 한 번에 최대 200건까지 등록할 수 있습니다.' }, { status: 400 })
    }
    const result = await validateEntries(entries)
    if (result.errors.length) {
      return NextResponse.json({ error: '확인이 필요한 행이 있습니다.', details: result.errors.slice(0, 20) }, { status: 409 })
    }
    if (new URL(req.url).searchParams.get('preview') === '1') {
      return NextResponse.json({ ready: result.ready.length, skipped: result.skipped })
    }
    if (!result.ready.length) return NextResponse.json({ updated: 0, skipped: result.skipped })

    const grouped = Map.groupBy(result.ready, (entry) => entry.orderId)
    await prisma.$transaction(async (tx) => {
      for (const [orderId, rows] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, updatedAt: true },
        })
        if (!order || !['PAYMENT_CONFIRMED', 'SHIPPING'].includes(order.status)) throw new Error('SHIPPING_CONFLICT')
        const locked = await tx.order.updateMany({
          where: { id: orderId, status: order.status, updatedAt: order.updatedAt },
          data: { status: 'SHIPPING' },
        })
        if (locked.count !== 1) throw new Error('SHIPPING_CONFLICT')
        for (const row of rows) {
          const updated = await tx.orderItem.updateMany({
            where: { id: row.itemId, orderId, shippedAt: null, trackingNumber: null },
            data: { carrier: row.carrier, trackingNumber: row.trackingNumber, shippedAt: new Date() },
          })
          if (updated.count !== 1) throw new Error('SHIPPING_CONFLICT')
        }
        await writeAuditLogTx(tx, {
          adminId: session.user.id, action: 'bulk-ship', targetType: 'order', targetId: orderId,
          before: { status: order.status },
          after: { status: 'SHIPPING', items: rows.map(({ itemId, carrier, trackingNumber }) => ({ itemId, carrier, trackingNumber })) },
        })
      }
    }, { timeout: 60000, maxWait: 10000 })
    return NextResponse.json({ updated: result.ready.length, skipped: result.skipped })
  } catch (error) {
    if (error instanceof Error && error.message === 'SHIPPING_CONFLICT') {
      return NextResponse.json({ error: '주문이나 송장 상태가 바뀌었습니다. 최신 목록을 내려받아 다시 확인해주세요.' }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: '다른 관리자가 배송 정보를 변경했습니다. 다시 시도해주세요.' }, { status: 409 })
    }
    console.error('[ShippingSheet] 일괄 등록 실패:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: '송장번호를 등록하지 못했습니다.' }, { status: 500 })
  }
}
