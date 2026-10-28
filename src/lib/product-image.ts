export const MAX_IMAGE_BYTES = 3 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_KEY = /^[a-f0-9-]{36}\.webp$/

export function validateImageFile(file: { size: number; type: string }) {
  if (!IMAGE_TYPES.includes(file.type)) return 'JPG, PNG, WebP 사진만 업로드할 수 있습니다.'
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return '사진 용량은 3MB 이하여야 합니다.'
  return null
}

export function isProductImageUrl(value: unknown): value is string | null | undefined {
  return value == null || value === '' || (typeof value === 'string' &&
    value.startsWith('/api/product-images/') && IMAGE_KEY.test(value.slice('/api/product-images/'.length)))
}
