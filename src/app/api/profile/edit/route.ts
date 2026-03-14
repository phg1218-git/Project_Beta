import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { extractPhoneNumbers, isValidPhoneNumber } from '@/lib/utils'

interface ProfileEditBody {
  name: string
  phone: string
  addressBase: string
  addressDetail?: string
}

// 프로필 수정
export async function PATCH(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body: ProfileEditBody = await req.json()
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

    // 전화번호는 숫자만 저장
    const phoneNumbersOnly = extractPhoneNumbers(phone)
    const trimmedName = name.trim()
    const trimmedAddressBase = addressBase.trim()
    const trimmedAddressDetail = addressDetail?.trim() || null

    // 사용자 프로필 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: trimmedName,
        phone: phoneNumbersOnly,
        addressBase: trimmedAddressBase,
        addressDetail: trimmedAddressDetail,
      },
    })

    return NextResponse.json({
      success: true,
      message: '프로필이 저장되었습니다.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        addressBase: updatedUser.addressBase,
        addressDetail: updatedUser.addressDetail,
      },
    })
  } catch (error) {
    console.error('프로필 수정 오류:', error)
    return NextResponse.json(
      { error: '프로필 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
