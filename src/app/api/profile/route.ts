import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/profile
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressBase: true,
        addressDetail: true,
        role: true,
        profileComplete: true,
      },
    })

    // 유저 없으면 생성
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          profileComplete: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          addressBase: true,
          addressDetail: true,
          role: true,
          profileComplete: true,
        },
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PATCH /api/profile
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, addressBase, addressDetail, profileComplete } = body

    // 유저 조회 (없으면 생성)
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          profileComplete: false,
        },
      })
    }

    // 프로필 업데이트
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(addressBase !== undefined && { addressBase }),
        ...(addressDetail !== undefined && { addressDetail }),
        ...(profileComplete !== undefined && { profileComplete }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressBase: true,
        addressDetail: true,
        role: true,
        profileComplete: true,
      },
    })

    // 기본 배송지 자동 생성/갱신
    if (profileComplete && name && phone && addressBase) {
      const existingDefault = await prisma.shippingAddress.findFirst({
        where: { userId: updatedUser.id, isDefault: true },
      })

      if (existingDefault) {
        await prisma.shippingAddress.update({
          where: { id: existingDefault.id },
          data: {
            name,
            phone,
            addressBase,
            addressDetail: addressDetail || '',
          },
        })
      } else {
        await prisma.shippingAddress.create({
          data: {
            userId: updatedUser.id,
            name,
            phone,
            addressBase,
            addressDetail: addressDetail || '',
            label: '기본배송지',
            isDefault: true,
          },
        })
      }
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: '프로필 수정에 실패했습니다.' }, { status: 500 })
  }
}