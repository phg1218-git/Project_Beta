import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { withdrawUser, WithdrawBlockedError } from '@/lib/withdraw'
import { isSuperAdminEmail } from '@/lib/admin-roles'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 전화·이메일로 접수한 탈퇴 요청을 관리자가 처리
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await adminAuth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    const { id } = await params
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } })
    if (isSuperAdminEmail(target?.email)) {
      return NextResponse.json({ error: '최고관리자 계정은 탈퇴 처리할 수 없습니다.' }, { status: 403 })
    }
    const body = await req.json().catch(() => null)
    if (body?.confirmedRequest !== true) {
      return NextResponse.json({ error: '본인의 탈퇴 요청을 확인했는지 체크해주세요.' }, { status: 400 })
    }
    const result = await prisma.$transaction((tx) => withdrawUser(tx, id, { id: session.user.id, by: 'admin' }))
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof WithdrawBlockedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === 'NOT_FOUND' ? 404 : 409 })
    }
    console.error('관리자 탈퇴 처리 오류:', error)
    return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 })
  }
}
