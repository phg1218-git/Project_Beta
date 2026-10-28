import { isProductImageUrl } from '@/lib/product-image'

// 관리자 상품 등록·수정 입력 검증 (PostgreSQL Int 범위, 문자열 길이, 불리언)
export const PG_INT_MAX = 2_147_483_647
export const PRODUCT_NAME_MAX = 100
export const PRODUCT_DESCRIPTION_MAX = 5000

export interface ProductInput {
  name?: string
  description?: string
  price?: number
  stock?: number
  imageUrl?: string | null
  isActive?: boolean
  // 수정 화면을 연 시점의 재고 — 그 사이 주문으로 재고가 바뀌었으면 덮어쓰지 않음
  expectedStock?: number
}

const isIntInRange = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= PG_INT_MAX

// partial=false(등록)는 이름·설명·가격·재고 필수, partial=true(수정)는 보낸 항목만 검증
export function parseProductInput(body: unknown, partial: boolean): ProductInput | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '잘못된 요청 형식입니다.'
  const { name, description, price, stock, imageUrl, isActive, expectedStock } = body as Record<string, unknown>
  const result: ProductInput = {}

  if (name !== undefined || !partial) {
    if (typeof name !== 'string' || !name.trim()) return '상품명을 입력해주세요.'
    if (name.trim().length > PRODUCT_NAME_MAX) return `상품명은 ${PRODUCT_NAME_MAX}자 이내로 입력해주세요.`
    result.name = name.trim()
  }
  if (description !== undefined || !partial) {
    if (typeof description !== 'string' || !description.trim()) return '상품 설명을 입력해주세요.'
    if (description.trim().length > PRODUCT_DESCRIPTION_MAX) return `상품 설명은 ${PRODUCT_DESCRIPTION_MAX.toLocaleString()}자 이내로 입력해주세요.`
    result.description = description.trim()
  }
  if (price !== undefined || !partial) {
    if (!isIntInRange(price)) return `가격은 0~${PG_INT_MAX.toLocaleString()} 사이의 정수로 입력해주세요.`
    result.price = price
  }
  if (stock !== undefined || !partial) {
    if (!isIntInRange(stock)) return `재고는 0~${PG_INT_MAX.toLocaleString()} 사이의 정수로 입력해주세요.`
    result.stock = stock
  }
  if (expectedStock !== undefined) {
    if (!isIntInRange(expectedStock)) return '재고 확인 값이 올바르지 않습니다.'
    result.expectedStock = expectedStock
  }
  if (imageUrl !== undefined) {
    if (!isProductImageUrl(imageUrl)) return '사진을 다시 업로드해주세요.'
    result.imageUrl = imageUrl || null
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') return '판매 여부 값이 올바르지 않습니다.'
    result.isActive = isActive
  }
  if (partial && Object.keys(result).every((k) => k === 'expectedStock')) return '변경할 내용이 없습니다.'
  return result
}
