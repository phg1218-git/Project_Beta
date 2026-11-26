import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminAuth } from '@/lib/admin-auth'
import { writeAuditLogTx } from '@/lib/audit-log'
import { currentSeason } from '@/lib/order-number'

async function seasonInfo() {
  const season = await currentSeason(prisma)
  const row = await prisma.orderSeason.findUnique({ where: { season } })
  return { season, orderCount: row?.lastNumber ?? 0 }
}

export async function GET() {
  if (!await adminAuth()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  return NextResponse.json(await seasonInfo())
}

// 현재 시즌을 마감한다. 이후 주문은 다음 시즌 번호(예: 2027-1)부터 받는다.
export async function POST(req: Request) {
  try {
    const session = await adminAuth()
    if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    const body = await req.json().catch(() => null)
    const season = Number(body?.season)

    const result = await prisma.$transaction(async (tx) => {
      const current = await currentSeason(tx)
      if (season !== current) return null
      const closed = await tx.orderSeason.upsert({
        where: { season },
        create: { season, closedAt: new Date(), closedBy: session.user.id },
        update: { closedAt: new Date(), closedBy: session.user.id },
      })
      await writeAuditLogTx(tx, {
        adminId: session.user.id,
        action: 'close-season',
        targetType: 'season',
        targetId: String(season),
        after: { season, orderCount: closed.lastNumber },
      })
      return closed
    })
    if (!result) return NextResponse.json({ error: '현재 시즌이 바뀌었습니다. 새로고침 후 다시 시도해주세요.' }, { status: 409 })
    return NextResponse.json(await seasonInfo())
  } catch (error) {
    console.error('[Season] 시즌 마감 실패:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: '시즌을 마감하지 못했습니다.' }, { status: 500 })
  }
}
