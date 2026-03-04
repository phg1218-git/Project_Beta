import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// PATCH /api/shipping/[id] - 배송지 수정
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, phone, addressBase, addressDetail, label, isDefault } = body

    // 기본 배송지로 설정하면 기존 기본 배송지 해제
    if (isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId: session.user.id, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      })
    }

    const address = await prisma.shippingAddress.update({
      where: { id, userId: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(addressBase !== undefined && { addressBase }),
        ...(addressDetail !== undefined && { addressDetail }),
        ...(label !== undefined && { label }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    return NextResponse.json(address)
  } catch (error) {
    console.error('Shipping PATCH error:', error)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}

// DELETE /api/shipping/[id] - 배송지 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
    }

    const { id } = await params

    await prisma.shippingAddress.delete({
      where: { id, userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Shipping DELETE error:', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
