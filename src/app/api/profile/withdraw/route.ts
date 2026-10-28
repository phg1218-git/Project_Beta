import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { withdrawUser, WithdrawBlockedError } from '@/lib/withdraw'

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
