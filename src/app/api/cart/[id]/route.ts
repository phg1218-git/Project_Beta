import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 장바구니 아이템 수량 변경
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

    const { quantity } = await req.json()

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: '수량은 1 이상의 정수여야 합니다.' },
        { status: 400 }
      )
    }

    // 해당 장바구니 아이템이 본인 것인지 확인
    const cartItem = await prisma.cartItem.findFirst({
      where: { id, userId: session.user.id },
      include: { product: true },
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: '장바구니 아이템을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 재고 확인
    if (quantity > cartItem.product.stock) {
      return NextResponse.json(
        { error: '재고가 부족합니다.' },
        { status: 400 }
      )
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: { product: true },
    })

    return NextResponse.json({
      id: updated.id,
      productId: updated.productId,
      productName: updated.product.name,
      price: updated.product.price,
      quantity: updated.quantity,
      imageUrl: updated.product.imageUrl,
    })
  } catch (error) {
    console.error('장바구니 수량 변경 오류:', error)
    return NextResponse.json(
      { error: '수량 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 장바구니 아이템 삭제
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

    // 해당 장바구니 아이템이 본인 것인지 확인
    const cartItem = await prisma.cartItem.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: '장바구니 아이템을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    await prisma.cartItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('장바구니 아이템 삭제 오류:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
