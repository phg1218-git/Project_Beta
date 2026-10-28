import { Prisma } from '@prisma/client'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { cancelOrderWithRestock, CANCEL_REASON_EXPIRED } from '@/lib/cancel-order'

// 계좌를 자동 조회하지 않으므로 시간 경과만으로 미입금을 단정하지 않는다.
// GET  : 입금기한이 지난 주문을 검토용으로 조회 (변경 없음)
// POST : 관리자가 실제 계좌에서 미입금을 확인하고 선택한 DRAFT 주문만 취소
//        DEPOSIT_REQUESTED(고객이 입금했다고 요청한 주문)는 일괄 취소 대상에서 제외

const MAX_SELECT = 100

function getCutoff() {
  const parsed = parseInt(process.env.DEPOSIT_TIMEOUT_HOURS ?? '24', 10)
  const timeoutHours = Number.isFinite(parsed) && parsed > 0 ? parsed : 24
  return { timeoutHours, cutoff: new Date(Date.now() - timeoutHours * 60 * 60 * 1000) }
}

async function requireAdmin() {
  const session = await adminAuth()
  return session?.user ?? null
}

const listSelect = {
  id: true,
  status: true,
  totalAmount: true,
  depositorName: true,
  createdAt: true,
  requestedDepositAt: true,
  user: { select: { name: true, email: true } },
} satisfies Prisma.OrderSelect

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    const { timeoutHours, cutoff } = getCutoff()

    const [drafts, requested] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'DRAFT', createdAt: { lte: cutoff } },
        select: listSelect,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          status: 'DEPOSIT_REQUESTED',
          OR: [{ requestedDepositAt: { lte: cutoff } }, { requestedDepositAt: null, updatedAt: { lte: cutoff } }],
        },
        select: listSelect,
        orderBy: { requestedDepositAt: 'asc' },
      }),
    ])

    return NextResponse.json({ timeoutHours, cutoff: cutoff.toISOString(), drafts, requested })
  } catch (error) {
    console.error('만료 후보 조회 오류:', error)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
    }
    const { orderIds, confirmedNoDeposit } = (body ?? {}) as { orderIds?: unknown; confirmedNoDeposit?: unknown }

    if (confirmedNoDeposit !== true) {
      return NextResponse.json({ error: '계좌 입금내역 확인 여부가 필요합니다.' }, { status: 400 })
    }
    if (
      !Array.isArray(orderIds) ||
      orderIds.length === 0 ||
      orderIds.length > MAX_SELECT ||
      !orderIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 128)
    ) {
      return NextResponse.json({ error: `취소할 주문을 1~${MAX_SELECT}건 선택해주세요.` }, { status: 400 })
    }

    const ids = [...new Set(orderIds as string[])]
    const { cutoff } = getCutoff()
    const orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      include: { items: { select: { productId: true, quantity: true } } },
    })
    const byId = new Map(orders.map((o) => [o.id, o]))

    const canceled: string[] = []
    const skipped: { id: string; reason: string }[] = []
    let restoredStock = 0

    for (const id of ids) {
      const order = byId.get(id)
      if (!order) {
        skipped.push({ id, reason: '주문 없음' })
        continue
      }
      if (order.status !== 'DRAFT') {
        skipped.push({ id, reason: `입금 대기 상태가 아님(${order.status})` })
        continue
      }
      if (order.createdAt > cutoff) {
        skipped.push({ id, reason: '입금기한 미경과' })
        continue
      }
      try {
        const restored = await prisma.$transaction(async (tx) => {
          const count = await cancelOrderWithRestock(tx, order, {
            reason: CANCEL_REASON_EXPIRED,
            extraWhere: { createdAt: { lte: cutoff } },
          })
          await tx.adminActionLog.create({
            data: {
              adminId: admin.id,
              action: 'expire',
              targetType: 'order',
              targetId: order.id,
              beforeJson: JSON.stringify({ status: order.status, createdAt: order.createdAt }),
              afterJson: JSON.stringify({ status: 'CANCELED', confirmedNoDeposit: true, restoredStock: count }),
            },
          })
          return count
        })
        restoredStock += restored
        canceled.push(id)
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          skipped.push({ id, reason: '처리 중 주문 상태가 변경됨' })
        } else {
          console.error(`만료 취소 실패 order:${id}`, err)
          skipped.push({ id, reason: '처리 오류' })
        }
      }
    }

    return NextResponse.json({ canceled, skipped, restoredStock })
  } catch (error) {
    console.error('만료 주문 취소 오류:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
