import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdminEmail } from '@/lib/admin-roles'

// JWT는 화면 탐색용 힌트다. 일반 관리자는 DB 역할을 재검증하고,
// 최고관리자는 DB의 이메일과 서버 환경변수를 대조한다.
export async function adminAuth() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  })
  if (!user) return null
  const isSuperAdmin = isSuperAdminEmail(user.email)
  if (user.role !== 'ADMIN' && !isSuperAdmin) return null
  return { ...session, user: { ...session.user, role: 'ADMIN' as const, isSuperAdmin } }
}

export async function superAdminAuth() {
  const session = await adminAuth()
  return session?.user.isSuperAdmin ? session : null
}
