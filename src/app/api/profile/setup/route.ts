import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { extractPhoneNumbers, isValidPhoneNumber } from '@/lib/utils'

interface ProfileSetupBody {
  name: string
  phone: string
  addressBase: string
  addressDetail?: string
}

// 프로필 설정 저장
export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body: ProfileSetupBody = await req.json()
    const { name, phone, addressBase, addressDetail } = body

    // 서버 측 유효성 검사
    const errors: Record<string, string> = {}

    if (!name || name.trim().length < 2) {
      errors.name = '이름은 2자 이상 입력해주세요.'
    }

    if (!phone) {
      errors.phone = '전화번호를 입력해주세요.'
    } else if (!isValidPhoneNumber(phone)) {
      errors.phone = '올바른 휴대폰 번호를 입력해주세요. (010-0000-0000)'
    }

    if (!addressBase || addressBase.trim().length < 5) {
      errors.addressBase = '주소를 검색해서 입력해주세요.'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: '입력값을 확인해주세요.', errors },
        { status: 400 }
      )
    }

    // 전화번호는 숫자만 저장 (01012345678 형태)
    const phoneNumbersOnly = extractPhoneNumbers(phone)
    const trimmedName = name.trim()
    const trimmedAddressBase = addressBase.trim()
    const trimmedAddressDetail = addressDetail?.trim() || null

    // 트랜잭션으로 프로필 업데이트 + 기본배송지 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. 사용자 프로필 업데이트
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: trimmedName,
          phone: phoneNumbersOnly,
          addressBase: trimmedAddressBase,
          addressDetail: trimmedAddressDetail,
          profileComplete: true,
        },
      })

      // 2. 기존에 기본배송지가 있는지 확인
      const existingDefaultAddress = await tx.shippingAddress.findFirst({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
      })

      // 3. 기본배송지가 없으면 새로 생성
      if (!existingDefaultAddress) {
        await tx.shippingAddress.create({
          data: {
            userId: session.user.id,
            name: trimmedName,
            phone: phoneNumbersOnly,
            addressBase: trimmedAddressBase,
            addressDetail: trimmedAddressDetail,
            label: '[기본배송지]',
            isDefault: true,
          },
        })
      }

      return updatedUser
    })

    return NextResponse.json({
      success: true,
      message: '프로필이 저장되었습니다.',
      user: {
        id: result.id,
        name: result.name,
        profileComplete: result.profileComplete,
      },
    })
  } catch (error) {
    console.error('프로필 저장 오류:', error)
    return NextResponse.json(
      { error: '프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}

// 현재 프로필 정보 조회
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressBase: true,
        addressDetail: true,
        profileComplete: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return NextResponse.json(
      { error: '프로필 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}