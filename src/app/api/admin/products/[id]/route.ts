import { Prisma } from '@prisma/client'
import { parseProductInput } from '@/lib/product-input'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 상품 단건 조회 (수정 폼 초기화용)
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await adminAuth()
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
    const session = await adminAuth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const input = parseProductInput(await req.json().catch(() => null), true)
    if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 })
    const { expectedStock, ...data } = input

    let product
    try {
      product = await prisma.product.update({
        // 재고를 바꿀 때 화면을 연 뒤 주문으로 재고가 변했으면 덮어쓰지 않음
        where: { id, ...(data.stock !== undefined && expectedStock !== undefined && { stock: expectedStock }) },
        data,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        const exists = await prisma.product.findUnique({ where: { id }, select: { stock: true } })
        if (!exists) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
        return NextResponse.json(
          { error: `수정하는 동안 주문으로 재고가 ${exists.stock}개로 바뀌었습니다. 새로고침 후 다시 입력해주세요.`, currentStock: exists.stock },
          { status: 409 },
        )
      }
      throw error
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('상품 수정 오류:', error)
    return NextResponse.json({ error: '상품 수정에 실패했습니다.' }, { status: 500 })
  }
}

// 상품 삭제
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await adminAuth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
      // 주문 이력이 있는 상품은 주문 기록 보존을 위해 삭제하지 않음
      if (error.code === 'P2003') {
        return NextResponse.json({ error: '주문 이력이 있는 상품은 삭제할 수 없습니다. 숨김으로 바꿔주세요.' }, { status: 409 })
      }
    }
    console.error('상품 삭제 오류:', error)
    return NextResponse.json({ error: '상품 삭제에 실패했습니다.' }, { status: 500 })
  }
}
