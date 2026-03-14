import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 배송지 수정
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

    // 본인 소유 확인
    const existing = await prisma.shippingAddress.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '배송지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { name, phone, addressBase, addressDetail, label } = body as {
      name?: string
      phone?: string
      addressBase?: string
      addressDetail?: string
      label?: string
    }

    // 입력값 검증
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return NextResponse.json({ error: '수령인 이름은 2자 이상 입력해주세요.' }, { status: 400 })
    }
    if (phone !== undefined) {
      const digits = phone.replace(/\D/g, '')
      if (!/^01[0-9]{8,9}$/.test(digits)) {
        return NextResponse.json({ error: '올바른 휴대폰 번호를 입력해주세요.' }, { status: 400 })
      }
    }
    if (addressBase !== undefined && (typeof addressBase !== 'string' || !addressBase.trim())) {
      return NextResponse.json({ error: '주소를 입력해주세요.' }, { status: 400 })
    }

    const updated = await prisma.shippingAddress.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(addressBase !== undefined && { addressBase }),
        ...(addressDetail !== undefined && { addressDetail }),
        ...(label !== undefined && { label }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('배송지 수정 오류:', error)
    return NextResponse.json(
      { error: '배송지 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 배송지 삭제
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 본인 소유 확인
    const existing = await prisma.shippingAddress.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '배송지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 기본 배송지 삭제 시 다른 배송지 중 최신 항목을 기본으로 자동 지정
    if (existing.isDefault) {
      const nextDefault = await prisma.shippingAddress.findFirst({
        where: { userId: session.user.id, id: { not: id } },
        orderBy: { createdAt: 'desc' },
      })
      if (nextDefault) {
        await prisma.shippingAddress.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        })
      }
    }

    await prisma.shippingAddress.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('배송지 삭제 오류:', error)
    return NextResponse.json(
      { error: '배송지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
