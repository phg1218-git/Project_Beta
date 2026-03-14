import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 기본 배송지로 설정
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 해당 배송지가 본인 것인지 확인
    const existing = await prisma.shippingAddress.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '배송지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 트랜잭션으로 기존 기본배송지 해제 + 새 기본배송지 설정
    await prisma.$transaction([
      // 기존 기본배송지 해제
      prisma.shippingAddress.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      }),
      // 새 기본배송지 설정
      prisma.shippingAddress.update({
        where: { id },
        data: {
          isDefault: true,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('기본 배송지 설정 오류:', error)
    return NextResponse.json(
      { error: '기본 배송지 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
