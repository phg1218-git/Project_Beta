import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// 상품 등록
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, price, stock, isActive } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: '상품 설명을 입력해주세요.' }, { status: 400 })
    }

    const priceNum = Number(price)
    if (price === undefined || price === null || !Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: '가격은 0 이상의 숫자여야 합니다.' }, { status: 400 })
    }

    const stockNum = Number(stock)
    if (stock === undefined || stock === null || !Number.isInteger(stockNum) || stockNum < 0) {
      return NextResponse.json({ error: '재고는 0 이상의 정수여야 합니다.' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        stock: stockNum,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('상품 등록 오류:', error)
    return NextResponse.json({ error: '상품 등록에 실패했습니다.' }, { status: 500 })
  }
}