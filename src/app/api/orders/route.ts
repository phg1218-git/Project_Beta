import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface OrderItemInput {
  productId: string
  quantity: number
  recipientName?: string
  recipientPhone?: string
  recipientAddressBase?: string
  recipientAddressDetail?: string
}

interface OrderItemData {
  productId: string
  quantity: number
  unitPrice: number
  recipientName: string
  recipientPhone: string
  recipientAddressBase: string
  recipientAddressDetail: string | null
}

// 주문 목록 조회
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('주문 목록 조회 오류:', error)
    return NextResponse.json({ error: '주문 목록 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 주문 생성
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 프로필 완성 여부 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        shippingAddresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    })

    if (!user?.profileComplete) {
      return NextResponse.json({ error: '배송 정보를 먼저 등록해주세요.' }, { status: 403 })
    }

    const body = await req.json()
    const { items, fromCart, cartItemIds, depositorName, shippingAddressId } = body as {
      items: OrderItemInput[]
      fromCart?: boolean
      cartItemIds?: string[]
      depositorName?: string
      shippingAddressId?: string
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '주문할 상품이 없습니다.' }, { status: 400 })
    }

    // 수량 검증
    for (const item of items) {
      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return NextResponse.json({ error: '수량은 1 이상의 정수여야 합니다.' }, { status: 400 })
      }
    }

    // 배송지 결정: shippingAddressId 전달 시 소유권 검증 후 사용, 아니면 기본배송지 fallback
    let resolvedAddress = user.shippingAddresses[0]

    if (shippingAddressId) {
      const requestedAddress = await prisma.shippingAddress.findUnique({
        where: { id: shippingAddressId },
      })

      if (!requestedAddress || requestedAddress.userId !== session.user.id) {
        return NextResponse.json({ error: '유효하지 않은 배송지입니다.' }, { status: 403 })
      }

      resolvedAddress = requestedAddress
    }

    if (!resolvedAddress) {
      return NextResponse.json(
        { code: 'NO_SHIPPING_ADDRESS', error: '기본 배송지를 등록해주세요.' },
        { status: 400 }
      )
    }

    const productIds = items.map((item) => item.productId)

    const order = await prisma.$transaction(async (tx) => {
      // 1. 트랜잭션 내 상품 조회 (활성 여부 구분)
      const allProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      })

      if (allProducts.length !== productIds.length) {
        throw new Error('PRODUCT_NOT_FOUND')
      }

      const inactiveProducts = allProducts.filter((p) => !p.isActive)
      if (inactiveProducts.length > 0) {
        throw new Error(`PRODUCT_INACTIVE:${inactiveProducts.map((p) => p.name).join(', ')}`)
      }

      const products = allProducts

      // 2. 총액 계산 + 주문 아이템 구성
      let totalAmount = 0
      const orderItemsData: OrderItemData[] = []

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId)!
        totalAmount += product.price * item.quantity
        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          recipientName: item.recipientName || resolvedAddress.name,
          recipientPhone: item.recipientPhone || resolvedAddress.phone,
          recipientAddressBase: item.recipientAddressBase || resolvedAddress.addressBase,
          recipientAddressDetail: item.recipientAddressDetail ?? resolvedAddress.addressDetail,
        })
      }

      // 3. 주문 생성
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          totalAmount,
          depositorName: depositorName || user.name,
          bankAccountSnapshot: process.env.BANK_ACCOUNT_INFO || '농협 000-0000-0000-00 (오늘의귤)',
          status: 'DRAFT',
          items: { create: orderItemsData },
        },
        include: { items: { include: { product: true } } },
      })

      // 4. 원자적 재고 차감
      for (const item of items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (result.count === 0) {
          const product = products.find((p) => p.id === item.productId)
          throw new Error(`STOCK_INSUFFICIENT:${product?.name ?? item.productId}`)
        }
      }

      // 5. 장바구니 아이템 삭제
      if (fromCart && cartItemIds && cartItemIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: { id: { in: cartItemIds }, userId: session.user.id },
        })
      }

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return NextResponse.json(
          { code: 'PRODUCT_NOT_FOUND', error: '일부 상품을 찾을 수 없습니다.' },
          { status: 400 }
        )
      }
      if (error.message.startsWith('PRODUCT_INACTIVE:')) {
        const productNames = error.message.split(':')[1]
        return NextResponse.json(
          { code: 'PRODUCT_INACTIVE', error: `판매 종료된 상품이 포함되어 있습니다: ${productNames}` },
          { status: 400 }
        )
      }
      if (error.message.startsWith('STOCK_INSUFFICIENT:')) {
        const productName = error.message.split(':')[1]
        return NextResponse.json(
          {
            code: 'STOCK_INSUFFICIENT',
            error: `${productName}의 재고가 부족합니다. 다른 고객이 동시에 주문했을 수 있습니다.`,
          },
          { status: 409 }
        )
      }
    }
    console.error('주문 생성 오류:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: '주문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
