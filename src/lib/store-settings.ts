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
