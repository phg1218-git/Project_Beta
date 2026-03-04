import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/shipping/default - 기본 배송지 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 기본 배송지 먼저 찾기
    let defaultAddress = await prisma.shippingAddress.findFirst({
      where: { userId: session.user.id, isDefault: true },
    })

    // 기본 배송지 없으면 가장 최근 배송지
    if (!defaultAddress) {
      defaultAddress = await prisma.shippingAddress.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      })
    }

    // 배송지 자체가 없으면 유저 프로필 정보 사용
    if (!defaultAddress) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, phone: true, addressBase: true, addressDetail: true },
      })

      if (user?.name && user?.phone && user?.addressBase) {
        return NextResponse.json({
          name: user.name,
          phone: user.phone,
          addressBase: user.addressBase,
          addressDetail: user.addressDetail || '',
          isDefault: true,
          isFromProfile: true,
        })
      }
    }

    return NextResponse.json(defaultAddress || null)
  } catch (error) {
    console.error('Default shipping GET error:', error)
    return NextResponse.json(null)
  }
}
