import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 상품 단건 조회 (수정 폼 초기화용)
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('상품 조회 오류:', error)
    return NextResponse.json({ error: '상품 조회에 실패했습니다.' }, { status: 500 })
  }
}

// 상품 수정
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, price, stock, imageUrl, isActive } = body as {
      name?: string
      description?: string
      price?: number
      stock?: number
      imageUrl?: string
      isActive?: boolean
    }

    // 숫자 필드 검증
    if (price !== undefined) {
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: '가격은 0 이상의 숫자여야 합니다.' }, { status: 400 })
      }
    }
    if (stock !== undefined) {
      if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: '재고는 0 이상의 정수여야 합니다.' }, { status: 400 })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('상품 수정 오류:', error)
    return NextResponse.json({ error: '상품 수정에 실패했습니다.' }, { status: 500 })
  }
}

// 상품 삭제
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('상품 삭제 오류:', error)
    return NextResponse.json({ error: '상품 삭제에 실패했습니다.' }, { status: 500 })
  }
}
