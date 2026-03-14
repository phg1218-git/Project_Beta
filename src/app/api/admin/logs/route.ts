import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const masked = local.length <= 2 ? local[0] + '*' : local.slice(0, 2) + '***'
  return `${masked}@${domain}`
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function maskJsonFields(json: string | null): string | null {
  if (!json) return null
  try {
    const obj = JSON.parse(json)
    if (obj.email) obj.email = maskEmail(String(obj.email))
    if (obj.phone) obj.phone = maskPhone(String(obj.phone))
    return JSON.stringify(obj)
  } catch {
    return json
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') ?? ''
    const adminId = searchParams.get('adminId') ?? ''
    const from = searchParams.get('from') ?? ''
    const to = searchParams.get('to') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = 50

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    if (action) where.action = action
    if (adminId) where.adminId = adminId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    const [logs, total] = await Promise.all([
      db.adminActionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.adminActionLog.count({ where }),
    ])

    // 개인정보 마스킹
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maskedLogs = logs.map((log: any) => ({
      ...log,
      beforeJson: maskJsonFields(log.beforeJson),
      afterJson: maskJsonFields(log.afterJson),
    }))

    return NextResponse.json({ logs: maskedLogs, total, page, pageSize })
  } catch (error) {
    console.error('로그 조회 오류:', error)
    return NextResponse.json({ error: '로그 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
