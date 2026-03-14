import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const ACTION_LABELS: Record<string, string> = {
  'confirm-payment': '입금확인',
  ship: '배송시작',
  delivered: '배송완료',
  expire: '만료정리',
}

interface LogEntry {
  id: string
  adminId: string
  action: string
  targetType: string
  targetId: string
  beforeJson: string | null
  afterJson: string | null
  createdAt: string
}

interface PageProps {
  searchParams: Promise<{ action?: string; adminId?: string; from?: string; to?: string; page?: string }>
}

async function getLogs(params: URLSearchParams): Promise<{ logs: LogEntry[]; total: number }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await import('@/lib/prisma')).prisma as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    const action = params.get('action')
    const adminId = params.get('adminId')
    const from = params.get('from')
    const to = params.get('to')
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))

    if (action) where.action = action
    if (adminId) where.adminId = adminId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const d = new Date(to)
        d.setHours(23, 59, 59, 999)
        where.createdAt.lte = d
      }
    }

    const [logs, total] = await Promise.all([
      db.adminActionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 50,
        take: 50,
      }),
      db.adminActionLog.count({ where }),
    ])
    return { logs, total }
  } catch {
    return { logs: [], total: 0 }
  }
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const sp = new URLSearchParams()
  if (params.action) sp.set('action', params.action)
  if (params.adminId) sp.set('adminId', params.adminId)
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
  sp.set('page', params.page ?? '1')

  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const { logs, total } = await getLogs(sp)
  const totalPages = Math.max(1, Math.ceil(total / 50))

  const pageHref = (p: number) => {
    const next = new URLSearchParams(sp)
    next.set('page', String(p))
    return `/admin/logs?${next.toString()}`
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📋 관리자 액션 로그</h1>
        <p className="text-gray-500 mt-1">핵심 관리 액션 이력을 조회합니다</p>
      </div>

      {/* 필터 */}
      <form method="GET" action="/admin/logs" className="mb-6 flex flex-wrap gap-2 items-center">
        <input type="hidden" name="page" value="1" />
        <select
          name="action"
          defaultValue={params.action ?? ''}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="">액션 전체</option>
          <option value="confirm-payment">입금확인</option>
          <option value="ship">배송시작</option>
          <option value="delivered">배송완료</option>
          <option value="expire">만료정리</option>
        </select>
        <input
          type="text"
          name="adminId"
          defaultValue={params.adminId ?? ''}
          placeholder="관리자 ID"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-44"
        />
        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ''}
          className="px-2 py-2 text-sm border border-gray-200 rounded-lg"
        />
        <span className="text-xs text-gray-400">~</span>
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ''}
          className="px-2 py-2 text-sm border border-gray-200 rounded-lg"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          검색
        </button>
        <Link href="/admin/logs" className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100">
          초기화
        </Link>
      </form>

      <p className="text-xs text-gray-400 mb-3">총 {total.toLocaleString()}건</p>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">해당 조건의 로그가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">일시</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">액션</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">대상</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">관리자 ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">변경 전</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">변경 후</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log: LogEntry) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.action === 'confirm-payment' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'ship' ? 'bg-orange-100 text-orange-700' :
                        log.action === 'delivered' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span className="font-mono">{log.targetId === 'bulk' ? '일괄' : log.targetId.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {log.adminId.slice(-8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                      {log.beforeJson ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                      {log.afterJson ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
              이전
            </Link>
          )}
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
