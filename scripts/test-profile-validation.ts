import assert from 'node:assert/strict'
import { isKoreanName, isProfilePhone, formatPhoneSuffix } from '../src/lib/profile-validation'

for (const name of ['홍길동', '김', '남궁민수']) assert.ok(isKoreanName(name))
for (const name of ['', 'John', '홍길동1', '홍 길동', 'ㄱㄴ', '홍😀', null, 123, '가'.repeat(31)]) assert.equal(isKoreanName(name), false)
assert.ok(isProfilePhone('010-1234-5678'))
for (const phone of ['011-1234-5678', '01012345678', '010-123-5678', '010-1234-56789', '010-abcd-5678', null, 123]) assert.equal(isProfilePhone(phone), false)
assert.equal(formatPhoneSuffix('010-1234-5678'), '1234-5678')
assert.equal(formatPhoneSuffix('12345678'), '1234-5678')
assert.equal(formatPhoneSuffix('1234-567'), '1234-567')
assert.equal(formatPhoneSuffix('abcd'), '')
console.log('PASS: Korean names, strict 010 format, paste formatting and partial editing')
