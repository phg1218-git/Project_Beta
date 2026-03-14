import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isValidPhoneNumber } from '@/lib/utils'

// 배송지 목록 조회
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const addresses = await prisma.shippingAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('배송지 조회 오류:', error)
    return NextResponse.json(
      { error: '배송지 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 배송지 추가
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, phone, addressBase, addressDetail, label } = body

    // 유효성 검사
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: '수령인 이름은 2자 이상 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!phone || !isValidPhoneNumber(phone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!addressBase || addressBase.trim().length < 5) {
      return NextResponse.json(
        { error: '주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 기존 배송지가 없으면 기본배송지로 설정
    const existingCount = await prisma.shippingAddress.count({
      where: { userId: session.user.id },
    })

    const newAddress = await prisma.shippingAddress.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        phone: phone,
        addressBase: addressBase.trim(),
        addressDetail: addressDetail?.trim() || null,
        label: label?.trim() || null,
        isDefault: existingCount === 0,
      },
    })

    return NextResponse.json(newAddress, { status: 201 })
  } catch (error) {
    console.error('배송지 추가 오류:', error)
    return NextResponse.json(
      { error: '배송지 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}