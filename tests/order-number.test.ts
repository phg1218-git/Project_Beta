import test from 'node:test'
import assert from 'node:assert/strict'
import { seasonFor, displayOrderNumber } from '../src/lib/order-number'

// 한국시간 기준 날짜
const kst = (iso: string) => new Date(`${iso}T12:00:00+09:00`)

test('11월~2월은 시작 연도 시즌, 마감 전에는 3월 이후도 같은 시즌', () => {
  assert.equal(seasonFor(kst('2026-11-01'), null), 2026)
  assert.equal(seasonFor(kst('2027-01-15'), null), 2026)
  assert.equal(seasonFor(kst('2027-02-28'), null), 2026)
  assert.equal(seasonFor(kst('2027-05-01'), null), 2026)
  assert.equal(seasonFor(kst('2027-11-01'), null), 2027)
})

test('시즌 마감 후에는 다음 시즌, 마감을 잊어도 11월에는 새 시즌', () => {
  assert.equal(seasonFor(kst('2027-03-10'), 2026), 2027)
  assert.equal(seasonFor(kst('2027-11-20'), 2026), 2027)
  assert.equal(seasonFor(kst('2028-01-05'), 2026), 2027)
  assert.equal(seasonFor(kst('2027-11-20'), 2025), 2027)
})

test('한국시간 경계: 10월 31일 23시(KST)는 아직 이전 시즌', () => {
  assert.equal(seasonFor(new Date('2027-10-31T14:30:00Z'), null), 2026)
  assert.equal(seasonFor(new Date('2027-10-31T15:30:00Z'), null), 2027)
})

test('번호 없는 옛 주문은 id 끝 8자리로 표시', () => {
  assert.equal(displayOrderNumber({ id: 'x', orderNumber: '2026-3' }), '2026-3')
  assert.equal(displayOrderNumber({ id: 'clabcdefgh12345678', orderNumber: null }), '12345678')
})
