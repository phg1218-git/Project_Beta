import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// JWT는 화면 탐색용 힌트이며, 관리자 데이터 접근은 현재 DB 권한으로 판단한다.
export async function adminAuth() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== 'ADMIN') return null
  return { ...session, user: { ...session.user, role: user.role } }
}
