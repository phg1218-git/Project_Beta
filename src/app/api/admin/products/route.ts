import { parseProductInput } from '@/lib/product-input'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// 상품 등록
export async function POST(req: Request) {
  try {
    const session = await adminAuth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const input = parseProductInput(await req.json().catch(() => null), false)
    if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 })

    const product = await prisma.product.create({
      data: {
        name: input.name!,
        description: input.description!,
        price: input.price!,
        stock: input.stock!,
        imageUrl: input.imageUrl ?? null,
        isActive: input.isActive ?? true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('상품 등록 오류:', error)
    return NextResponse.json({ error: '상품 등록에 실패했습니다.' }, { status: 500 })
  }
}