import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/cart - 장바구니 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json([], { status: 200 })
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      cartItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl,
      }))
    )
  } catch (error) {
    console.error('Cart GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/cart - 장바구니 추가
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { productId, quantity = 1 } = await req.json()

    // 이미 있으면 수량 증가
    const existing = await prisma.cartItem.findFirst({
      where: { userId: session.user.id, productId },
    })

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      })
      return NextResponse.json(updated)
    }

    const cartItem = await prisma.cartItem.create({
      data: {
        userId: session.user.id,
        productId,
        quantity,
      },
    })

    return NextResponse.json(cartItem, { status: 201 })
  } catch (error) {
    console.error('Cart POST error:', error)
    return NextResponse.json({ error: '추가 실패' }, { status: 500 })
  }
}

// DELETE /api/cart - 전체 삭제
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
