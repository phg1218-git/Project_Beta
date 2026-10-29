import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { withdrawUser, WithdrawBlockedError } from '@/lib/withdraw'
import { isSuperAdminEmail } from '@/lib/admin-roles'

// 본인 회원 탈퇴 — 응답 후 클라이언트가 signOut으로 로그인 쿠키를 지운다
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    const body = await req.json().catch(() => null)
    if (body?.confirmed !== true) {
      return NextResponse.json({ error: '탈퇴 안내를 확인해주세요.' }, { status: 400 })
    }
    const userId = session.user.id
    const account = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (isSuperAdminEmail(account?.email)) {
      return NextResponse.json({ error: '최고관리자 계정은 탈퇴할 수 없습니다. 환경변수에서 최고관리자 지정을 먼저 변경해주세요.' }, { status: 409 })
    }
    const result = await prisma.$transaction((tx) => withdrawUser(tx, userId, { id: userId, by: 'self' }))
    return NextResponse.json({ success: true, retainedOrders: result.retainedOrders })
  } catch (error) {
    if (error instanceof WithdrawBlockedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === 'NOT_FOUND' ? 404 : 409 })
    }
    console.error('회원 탈퇴 오류:', error)
    return NextResponse.json({ error: '탈퇴 처리에 실패했습니다. 고객센터로 문의해주세요.' }, { status: 500 })
  }
}
