export function isKoreanName(value: unknown): value is string {
  return typeof value === 'string' && /^[가-힣]{1,30}$/.test(value.trim())
}
export function isProfilePhone(value: unknown): value is string {
  return typeof value === 'string' && /^010-\d{4}-\d{4}$/.test(value)
}
export function formatPhoneSuffix(value: string) {
  const digits = value.replace(/\D/g, '')
  const suffix = (digits.length === 11 && digits.startsWith('010') ? digits.slice(3) : digits).slice(0, 8)
  return suffix.length > 4 ? `${suffix.slice(0, 4)}-${suffix.slice(4)}` : suffix
}
