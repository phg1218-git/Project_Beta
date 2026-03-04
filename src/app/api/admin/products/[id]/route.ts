import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// PATCH /api/admin/products/[id] - 상품 수정
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, description, price, stock, isActive, imageUrl } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Admin product PATCH error:', error)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id] - 상품 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const { id } = await params

    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin product DELETE error:', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
