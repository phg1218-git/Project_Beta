import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/orders - 내 주문 목록
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
    console.error('Orders GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/orders - 주문 생성 + 신규 배송지 자동 학습
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const { items, depositorName } = await req.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '주문할 상품이 없어요.' }, { status: 400 })
    }

    // 상품 조회 및 재고 확인
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    // 총액 계산 및 재고 확인
    let totalAmount = 0
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        return NextResponse.json({ error: `상품을 찾을 수 없어요.` }, { status: 400 })
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `${product.name}의 재고가 부족해요. (현재 ${product.stock}개)` },
          { status: 400 }
        )
      }
      totalAmount += product.price * item.quantity
    }

    // 주문 생성 (트랜잭션)
    const order = await prisma.$transaction(async (tx) => {
      // 재고 차감
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // 주문 생성
      return tx.order.create({
        data: {
          userId: session.user.id,
          totalAmount,
          depositorName: depositorName || session.user.name,
          bankAccountSnapshot: process.env.BANK_ACCOUNT_INFO || '농협 123-4567-8901-23 (오늘의귤)',
          items: {
            create: items.map((item: {
              productId: string
              quantity: number
              recipientName: string
              recipientPhone: string
              recipientAddressBase: string
              recipientAddressDetail?: string
            }) => {
              const product = products.find((p) => p.id === item.productId)!
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price,
                recipientName: item.recipientName,
                recipientPhone: item.recipientPhone,
                recipientAddressBase: item.recipientAddressBase,
                recipientAddressDetail: item.recipientAddressDetail || '',
              }
            }),
          },
        },
        include: { items: true },
      })
    })

    // ✅ 신규 배송지 자동 학습 저장 (주문 완료 후)
    for (const item of items) {
      const { recipientName, recipientPhone, recipientAddressBase, recipientAddressDetail } = item

      // 동일한 배송지가 이미 있는지 확인
      const existingAddress = await prisma.shippingAddress.findFirst({
        where: {
          userId: session.user.id,
          name: recipientName,
          phone: recipientPhone,
          addressBase: recipientAddressBase,
        },
      })

      // 없으면 새로 저장
      if (!existingAddress && recipientName && recipientPhone && recipientAddressBase) {
        await prisma.shippingAddress.create({
          data: {
            userId: session.user.id,
            name: recipientName,
            phone: recipientPhone,
            addressBase: recipientAddressBase,
            addressDetail: recipientAddressDetail || '',
            label: null,
            isDefault: false,
          },
        })
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Order POST error:', error)
    return NextResponse.json({ error: '주문 생성에 실패했어요.' }, { status: 500 })
  }
}
