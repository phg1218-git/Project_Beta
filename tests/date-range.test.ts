import test from 'node:test'
import assert from 'node:assert/strict'
import { kstDateRange, parseKstDate } from '../src/lib/date-range'

test('기본 조회기간은 한국시간 오늘과 7일 전', () => {
  // 2026-11-26 08:30 KST (UTC로는 전날 23:30)
  const now = new Date('2026-11-25T23:30:00Z')
  const r = kstDateRange(undefined, undefined, now)
  assert.equal(r.toValue, '2026-11-26')
  assert.equal(r.fromValue, '2026-11-19')
  assert.equal(r.gte.toISOString(), '2026-11-18T15:00:00.000Z')
  assert.equal(r.lt.toISOString(), '2026-11-26T15:00:00.000Z')
})

test('입력한 기간을 쓰고, 순서가 뒤바뀌면 바로잡고, 잘못된 값은 기본값', () => {
  const now = new Date('2026-11-26T03:00:00Z')
  assert.deepEqual(
    [kstDateRange('2026-11-01', '2026-11-10', now).fromValue, kstDateRange('2026-11-01', '2026-11-10', now).toValue],
    ['2026-11-01', '2026-11-10'])
  const swapped = kstDateRange('2026-11-10', '2026-11-01', now)
  assert.deepEqual([swapped.fromValue, swapped.toValue], ['2026-11-01', '2026-11-10'])
  const bad = kstDateRange('2026-02-30', 'abc', now)
  assert.deepEqual([bad.fromValue, bad.toValue], ['2026-11-19', '2026-11-26'])
  assert.equal(parseKstDate('2026-02-30'), null)
})
