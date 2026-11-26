import type { Prisma } from '@prisma/client'

// 시즌은 11월~다음해 2월. 마감 전까지는 3월 이후에도 같은 시즌 번호를 계속 쓰고,
// 관리자가 마감하면 다음 시즌 번호로 넘어간다. 마감을 잊어도 11월이 되면 새 시즌으로 넘어간다.
export function kstYearMonth(date: Date): { year: number; month: number } {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 }
}

export function seasonFor(date: Date, lastClosedSeason: number | null): number {
  const { year, month } = kstYearMonth(date)
  const bySeasonStart = month >= 11 ? year : year - 1
  return lastClosedSeason == null ? bySeasonStart : Math.max(bySeasonStart, lastClosedSeason + 1)
}

export async function currentSeason(tx: Prisma.TransactionClient, now = new Date()): Promise<number> {
  const closed = await tx.orderSeason.aggregate({ _max: { season: true }, where: { closedAt: { not: null } } })
  return seasonFor(now, closed._max.season)
}

// 주문 트랜잭션 안에서 호출한다. 시즌 행을 잠그고 1 증가시키므로 동시 주문도 번호가 겹치지 않고,
// 주문 생성이 롤백되면 증가도 함께 롤백된다.
export async function allocateOrderNumber(tx: Prisma.TransactionClient, now = new Date()): Promise<string> {
  const season = await currentSeason(tx, now)
  const [row] = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "OrderSeason" ("season", "lastNumber") VALUES (${season}, 1)
    ON CONFLICT ("season") DO UPDATE SET "lastNumber" = "OrderSeason"."lastNumber" + 1
    RETURNING "lastNumber"`
  return `${season}-${row.lastNumber}`
}

// 번호가 없는 옛 주문(마이그레이션 전 생성 등)은 기존처럼 id 끝 8자리를 보여준다.
export function displayOrderNumber(order: { id: string; orderNumber?: string | null }): string {
  return order.orderNumber || order.id.slice(-8).toUpperCase()
}
