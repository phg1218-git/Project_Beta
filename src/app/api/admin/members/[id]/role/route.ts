import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { superAdminAuth } from '@/lib/admin-auth'
import { isSuperAdminEmail } from '@/lib/admin-roles'
import { writeAuditLogTx } from '@/lib/audit-log'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ADMIN_EMAILS에 등록된 최고관리자만 일반 관리자 권한을 지정·회수할 수 있다.
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await superAdminAuth()
    if (!session) return NextResponse.json({ error: '최고관리자 권한이 필요합니다.' }, { status: 403 })

    const { id } = await params
    if (id === session.user.id) {
      return NextResponse.json({ error: '자신의 권한은 변경할 수 없습니다.' }, { status: 409 })
    }

    const body = await req.json().catch(() => null)
    const role = body?.role
    if (role !== 'USER' && role !== 'ADMIN') {
      return NextResponse.json({ error: '변경할 권한을 확인해주세요.' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    })
    if (!target || !target.email) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })
    if (isSuperAdminEmail(target.email)) {
      return NextResponse.json({ error: '최고관리자 권한은 여기서 변경할 수 없습니다.' }, { status: 403 })
    }
    if (target.role === role) return NextResponse.json({ role, changed: false })

    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id, email: target.email, role: target.role },
        data: { role },
      })
      if (result.count !== 1) return false
      await writeAuditLogTx(tx, {
        adminId: session.user.id,
        action: 'change-role',
        targetType: 'user',
        targetId: id,
        before: { role: target.role },
        after: { role },
      })
      return true
    })
    if (!changed) return NextResponse.json({ error: '회원 권한이 변경되었습니다. 새로고침 후 다시 시도해주세요.' }, { status: 409 })
    return NextResponse.json({ role, changed: true })
  } catch (error) {
    console.error('[AdminRole] 권한 변경 실패:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: '권한을 변경하지 못했습니다.' }, { status: 500 })
  }
}
