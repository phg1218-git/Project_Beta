import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// 장바구니 목록 조회
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            imageUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 프론트엔드에서 사용하기 쉬운 형태로 변환
    const result = cartItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      stock: item.product.stock,
      imageUrl: item.product.imageUrl,
      isActive: item.product.isActive,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('장바구니 조회 오류:', error)
    return NextResponse.json(
      { error: '장바구니 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 장바구니에 상품 추가
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
    const { productId } = body
    const quantity: number = body.quantity ?? 1

    if (!productId) {
      return NextResponse.json(
        { error: '상품 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: '수량은 1 이상의 정수여야 합니다.' },
        { status: 400 }
      )
    }

    // 상품 존재 및 재고 확인
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: '재고가 부족합니다.' },
        { status: 400 }
      )
    }

    // 이미 장바구니에 있는지 확인
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    let cartItem

    if (existingItem) {
      // 수량 증가
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > product.stock) {
        return NextResponse.json(
          { error: '재고가 부족합니다.' },
          { status: 400 }
        )
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true },
      })
    } else {
      // 새로 추가
      cartItem = await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          quantity,
        },
        include: { product: true },
      })
    }

    return NextResponse.json({
      id: cartItem.id,
      productId: cartItem.productId,
      productName: cartItem.product.name,
      price: cartItem.product.price,
      quantity: cartItem.quantity,
      imageUrl: cartItem.product.imageUrl,
    }, { status: 201 })
  } catch (error) {
    console.error('장바구니 추가 오류:', error)
    return NextResponse.json(
      { error: '장바구니 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 장바구니 전체 삭제
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('장바구니 전체 삭제 오류:', error)
    return NextResponse.json(
      { error: '장바구니 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}