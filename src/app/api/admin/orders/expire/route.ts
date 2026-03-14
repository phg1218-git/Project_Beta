import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/audit-log'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const timeoutHours = parseInt(process.env.DEPOSIT_TIMEOUT_HOURS ?? '24', 10)
    const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000)

    const candidates = await prisma.order.findMany({
      where: { status: { in: ['DRAFT', 'DEPOSIT_REQUESTED'] } },
      include: { items: true },
    })

    const scanned = candidates.length
    let expired = 0
    let canceled = 0
    let restoredStock = 0
    let skipped = 0
    const errors: string[] = []

    for (const order of candidates) {
      try {
        const referenceTime: Date =
          order.status === 'DEPOSIT_REQUESTED'
            ? (order.requestedDepositAt ?? order.updatedAt)
            : order.createdAt

        if (referenceTime > cutoff) {
          skipped++
          continue
        }

        expired++

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELED',
              canceledAt: new Date(),
              cancelReason: '입금기한 만료 자동취소',
            },
          })

          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
            restoredStock += item.quantity
          }
        })

        canceled++
      } catch (err) {
        errors.push(`order:${order.id} - ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // 배치 로그는 트랜잭션 밖에서 비동기 기록 (실패해도 메인 결과에 영향 없음)
    await writeAuditLog({
      adminId: session.user.id,
      action: 'expire',
      targetType: 'bulk',
      targetId: 'bulk',
      before: { scanned, cutoff: cutoff.toISOString() },
      after: { expired, canceled, restoredStock, skipped, errors: errors.length },
    })

    return NextResponse.json({ scanned, expired, canceled, restoredStock, skipped, errors })
  } catch (error) {
    console.error('만료 주문 정리 오류:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
