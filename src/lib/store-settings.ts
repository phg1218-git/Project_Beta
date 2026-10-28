import { cache } from 'react'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { defaultStoreSettings, parseStoreSettings } from '@/lib/store-settings-data'

export const getStoreSettings = cache(async () => {
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 'main' } })
    return row ? parseStoreSettings(row.data) : { ...defaultStoreSettings }
  } catch (error) {
    // 배포 전 테이블이 없는 구버전 DB에서도 미확인 인증을 표시하지 않는다.
    // 일반 DB 장애는 기본 배송비로 대체하지 않고 상위 오류 화면에서 처리한다.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return { ...defaultStoreSettings }
    }
    throw error
  }
})

// 안내 페이지용: DB 장애 시에도 페이지는 기본값으로 표시 (주문·금액 계산에는 사용하지 말 것)
export async function getStoreSettingsForDisplay() {
  try {
    return await getStoreSettings()
  } catch (error) {
    console.error('[store-settings] 설정 조회 실패, 기본값 표시:', error instanceof Error ? error.message : error)
    return { ...defaultStoreSettings }
  }
}

export function contactText(settings: { contactPhone: string; contactHours: string }) {
  if (!settings.contactPhone) return '연락처 준비 중'
  return settings.contactHours ? `${settings.contactPhone} (${settings.contactHours})` : settings.contactPhone
}
