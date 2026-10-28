export const defaultStoreSettings = {
  farmName: '오늘의귤',
  region: '제주특별자치도 제주시 조천읍',
  introduction: '우리 가족이 키운 귤을 소개합니다.',
  contactPhone: '',
  contactHours: '',
  shippingNotice: '',
  damagePolicy: '',
  bankAccount: '',
  gapCertified: false,
  gapCertification: '',
  shippingFee: 0,
  terms: '',
  privacyPolicy: '',
}

export type StoreSettingsData = typeof defaultStoreSettings

export function parseStoreSettings(input: unknown): StoreSettingsData {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('설정 내용을 확인해주세요.')
  const data = input as Record<string, unknown>
  const result = { ...defaultStoreSettings }
  for (const field of Object.keys(defaultStoreSettings) as (keyof StoreSettingsData)[]) {
    const value = data[field]
    if (field === 'gapCertified') {
      if (typeof value !== 'boolean') throw new Error('인증 표시 여부를 확인해주세요.')
      result.gapCertified = value
    } else if (field === 'shippingFee') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1000000) {
        throw new Error('배송비는 0~1,000,000원 사이의 정수로 입력해주세요.')
      }
      result.shippingFee = value
    } else {
      const limit = ['terms', 'privacyPolicy'].includes(field) ? 20000 : 3000
      if (typeof value !== 'string' || value.length > limit) throw new Error(`${field} 입력 내용을 확인해주세요. (최대 ${limit}자)`)
      result[field] = value.trim()
    }
  }
  if (!result.farmName || result.farmName.length > 100) throw new Error('농장/상점 이름은 1~100자로 입력해주세요.')
  if (result.contactPhone && !/^[0-9+()\s-]{7,30}$/.test(result.contactPhone)) throw new Error('연락처 형식을 확인해주세요.')
  if (result.gapCertified && !result.gapCertification) throw new Error('인증 내용을 입력한 후 인증 표시를 켜주세요.')
  return result
}
