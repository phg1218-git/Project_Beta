import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

const load = sourceLoader()
const { parseProductInput, PG_INT_MAX } = load('src/lib/product-input.ts')

const valid = { name: ' 조생귤 5kg ', description: '설명', price: 25000, stock: 10, isActive: true }

test('상품 등록: 필수 항목·길이·Int 범위·불리언·형식 검증', () => {
  assert.deepEqual(parseProductInput(valid, false), { name: '조생귤 5kg', description: '설명', price: 25000, stock: 10, isActive: true })
  assert.match(parseProductInput({ ...valid, name: '' }, false), /상품명/)
  assert.match(parseProductInput({ ...valid, name: 'x'.repeat(101) }, false), /100자/)
  assert.match(parseProductInput({ ...valid, description: 'x'.repeat(5001) }, false), /설명/)
  assert.match(parseProductInput({ ...valid, price: PG_INT_MAX + 1 }, false), /가격/)
  assert.match(parseProductInput({ ...valid, price: '25000' }, false), /가격/)
  assert.match(parseProductInput({ ...valid, price: -1 }, false), /가격/)
  assert.match(parseProductInput({ ...valid, stock: 1.5 }, false), /재고/)
  assert.match(parseProductInput({ ...valid, stock: null }, false), /재고/)
  assert.match(parseProductInput({ ...valid, isActive: 'false' }, false), /판매 여부/)
  assert.match(parseProductInput({ ...valid, imageUrl: 'https://evil.test/a.png' }, false), /사진/)
  assert.match(parseProductInput({ name: '귤' }, false), /설명/)
  assert.equal(parseProductInput(null, false), '잘못된 요청 형식입니다.')
  assert.equal(parseProductInput([], false), '잘못된 요청 형식입니다.')
})

test('상품 수정: 보낸 항목만 검증하고 빈 수정은 거부', () => {
  assert.deepEqual(parseProductInput({ isActive: false }, true), { isActive: false })
  assert.deepEqual(parseProductInput({ stock: 3, expectedStock: 5 }, true), { stock: 3, expectedStock: 5 })
  assert.deepEqual(parseProductInput({ imageUrl: '' }, true), { imageUrl: null })
  assert.match(parseProductInput({}, true), /변경할 내용/)
  assert.match(parseProductInput({ expectedStock: 5 }, true), /변경할 내용/)
  assert.match(parseProductInput({ name: '   ' }, true), /상품명/)
  assert.match(parseProductInput({ stock: 3, expectedStock: -1 }, true), /재고 확인/)
})
