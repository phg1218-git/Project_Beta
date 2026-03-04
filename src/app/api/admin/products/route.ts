import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/admin/products - 상품 목록
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Admin products GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/products - 상품 등록
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, price, stock, isActive, imageUrl } = body

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: Number(price),
        stock: Number(stock) || 0,
        isActive: isActive ?? true,
        imageUrl: imageUrl || null,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Admin products POST error:', error)
    return NextResponse.json({ error: '등록 실패' }, { status: 500 })
  }
}
