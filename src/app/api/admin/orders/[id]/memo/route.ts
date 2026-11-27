import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminAuth()
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body.memo !== 'string' || body.memo.length > 1000) {
    return NextResponse.json({ error: '메모는 1,000자 이내로 입력해주세요.' }, { status: 400 })
  }
  const memo = body.memo.trim()
  try {
    await prisma.$transaction(async tx => {
      const order = await tx.order.findUniqueOrThrow({ where: { id }, select: { adminMemo: true } })
      await tx.order.update({ where: { id }, data: { adminMemo: memo || null } })
      await tx.adminActionLog.create({ data: {
        adminId: session.user.id, action: 'order-memo', targetType: 'order', targetId: id,
        beforeJson: JSON.stringify({ memo: order.adminMemo }),
        afterJson: JSON.stringify({ memo: memo || null }),
      } })
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '메모 저장에 실패했습니다.' }, { status: 500 })
  }
}
