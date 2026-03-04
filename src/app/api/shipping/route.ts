import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/shipping - 내 배송지 목록
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const addresses = await prisma.shippingAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Shipping GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/shipping - 배송지 추가
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, addressBase, addressDetail, label, isDefault } = body

    if (!name || !phone || !addressBase) {
      return NextResponse.json({ error: '필수 정보를 입력해주세요.' }, { status: 400 })
    }

    // 기본 배송지로 설정하면 기존 기본 배송지 해제
    if (isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await prisma.shippingAddress.create({
      data: {
        userId: session.user.id,
        name,
        phone,
        addressBase,
        addressDetail: addressDetail || '',
        label: label || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Shipping POST error:', error)
    return NextResponse.json({ error: '배송지 추가 실패' }, { status: 500 })
  }
}
