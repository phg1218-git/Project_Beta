import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// PATCH /api/cart/[id] - 수량 변경
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
    const { quantity } = await req.json()

    const updated = await prisma.cartItem.update({
      where: { id, userId: session.user.id },
      data: { quantity },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Cart PATCH error:', error)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}

// DELETE /api/cart/[id] - 개별 삭제
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

    await prisma.cartItem.delete({
      where: { id, userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
