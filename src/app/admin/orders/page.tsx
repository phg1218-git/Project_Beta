import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { AdminOrderActions } from '@/components/AdminOrderActions'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}

async function getOrders(status: string, q: string, page: number) {
  try {
    const where: Prisma.OrderWhereInput = {}

    if (status && status !== 'all') {
      where.status = status as Prisma.EnumOrderStatusFilter
    }

    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.order.count({ where }),
    ])
    return { orders, total }
  } catch {
    return { orders: [], total: 0 }
  }
}

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'DRAFT', label: '입금요청 전' },
  { key: 'DEPOSIT_REQUESTED', label: '입금확인 요청' },
  { key: 'PAYMENT_CONFIRMED', label: '결제확인' },
  { key: 'SHIPPING', label: '배송중' },
  { key: 'DELIVERED', label: '배송완료' },
  { key: 'CANCELED', label: '취소' },
]

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const params = await searchParams
  const currentStatus = params.status ?? 'all'
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { orders, total } = await getOrders(currentStatus, q, page)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildHref = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams()
    if (currentStatus !== 'all') sp.set('status', currentStatus)
    if (q) sp.set('q', q)
    sp.set('page', '1')
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    return `/admin/orders?${sp.toString()}`
  }

  const pageHref = (p: number) => {
    const sp = new URLSearchParams()
    if (currentStatus !== 'all') sp.set('status', currentStatus)
    if (q) sp.set('q', q)
    sp.set('page', String(p))
    return `/admin/orders?${sp.toString()}`
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📋 주문 관리</h1>
        <p className="text-gray-500 mt-1">주문 현황을 확인하고 처리하세요</p>
      </div>

      {/* 상태 필터 탭 */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildHref({ status: tab.key })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStatus === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <form method="GET" action="/admin/orders" className="mb-6 flex gap-2">
        {currentStatus !== 'all' && <input type="hidden" name="status" value={currentStatus} />}
        <input type="hidden" name="page" value="1" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="주문자명 · 이메일 · 주문번호 검색"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          검색
        </button>
        {q && (
          <Link
            href={buildHref({ q: '' })}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 결과 수 */}
      <p className="text-xs text-gray-400 mb-3">총 {total.toLocaleString()}건</p>

      {/* 주문 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">해당 조건의 주문이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">주문번호</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">주문자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상품</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">주문일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-900">
                        {order.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.user?.name || '-'}</p>
                        <p className="text-xs text-gray-500">{order.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        {order.items[0]?.product.name}
                        {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminOrderActions order={order} />
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
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                acc.push('...')
              }
              acc.push(p)
              return acc
            }, [])
            .map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
              ) : (
                <Link
                  key={p}
                  href={pageHref(p as number)}
                  className={`px-3 py-2 text-sm rounded-lg ${
                    page === p
                      ? 'bg-orange-500 text-white font-semibold'
                      : 'border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </Link>
              )
            )}
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
