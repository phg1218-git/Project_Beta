const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export function revenuePeriod(now = new Date()) {
  const korean = new Date(now.getTime() + KST_OFFSET_MS)
  const year = korean.getUTCFullYear()
  const month = korean.getUTCMonth()
  const boundary = (offset: number) => new Date(Date.UTC(year, month + offset, 1) - KST_OFFSET_MS)
  return { startOfLastMonth: boundary(-1), startOfMonth: boundary(0), startOfNextMonth: boundary(1) }
}
