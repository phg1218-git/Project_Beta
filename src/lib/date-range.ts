// 조회 화면의 날짜 범위는 한국시간 기준이며 종료일 하루 전체를 포함한다.
// 기본값은 오늘(종료)과 7일 전(시작)이다.
export const DEFAULT_RANGE_DAYS = 7
const DAY = 24 * 60 * 60 * 1000
const KST = 9 * 60 * 60 * 1000

export function kstDateString(date: Date): string {
  return new Date(date.getTime() + KST).toISOString().slice(0, 10)
}

// YYYY-MM-DD → 그날 한국시간 0시. 형식이 틀리거나 없는 날짜(2월 30일 등)면 null.
export function parseKstDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00+09:00`)
  return Number.isNaN(parsed.getTime()) || kstDateString(parsed) !== value ? null : parsed
}

export interface KstDateRange {
  fromValue: string
  toValue: string
  /** 시작일 한국시간 0시 (포함) */
  gte: Date
  /** 종료일 다음날 한국시간 0시 (미포함) */
  lt: Date
}

export function kstDateRange(from?: string | null, to?: string | null, now = new Date()): KstDateRange {
  const today = kstDateString(now)
  let toValue = parseKstDate(to) ? to! : today
  let fromValue = parseKstDate(from)
    ? from!
    : kstDateString(new Date(parseKstDate(toValue)!.getTime() - DEFAULT_RANGE_DAYS * DAY))
  if (fromValue > toValue) [fromValue, toValue] = [toValue, fromValue]
  return {
    fromValue,
    toValue,
    gte: parseKstDate(fromValue)!,
    lt: new Date(parseKstDate(toValue)!.getTime() + DAY),
  }
}
