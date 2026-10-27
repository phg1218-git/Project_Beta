import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/audit-log'
import { transitionOrder, OrderStateConflict } from '@/lib/order-state'

export async function POST() {
  try {
    const session = await adminAuth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const timeoutHours = Number(process.env.DEPOSIT_TIMEOUT_HOURS ?? '24')
    if (!Number.isFinite(timeoutHours) || timeoutHours <= 0 || timeoutHours > 8760) {
      throw new Error('Invalid DEPOSIT_TIMEOUT_HOURS')
    }
    const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000)

    const candidates = await prisma.order.findMany({
      // 입금했다고 알린 주문은 관리자가 실제 입금 여부를 확인해야 한다.
      where: { status: 'DRAFT', createdAt: { lte: cutoff } },
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
        expired++

        const restored = await prisma.$transaction(async (tx) => {
          await transitionOrder(tx, order.id, 'DRAFT', {
            status: 'CANCELED',
            canceledAt: new Date(),
            cancelReason: '입금기한 만료 자동취소',
          }, { createdAt: { lte: cutoff } })

          let quantity = 0
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
            quantity += item.quantity
          }
          return quantity
        })

        restoredStock += restored
        canceled++
      } catch (err) {
        if (err instanceof OrderStateConflict) {
          skipped++
          continue
        }
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
