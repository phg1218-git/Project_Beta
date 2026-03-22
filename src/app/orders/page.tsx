import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatPrice } from '@/lib/utils'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const BANK_ACCOUNT_INFO = process.env.BANK_ACCOUNT_INFO || '농협 000-0000-0000-00 (오늘의귤)'
const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ status?: string; from?: string; to?: string; page?: string }>
}

async function getOrders(
  userId: string,
  status: string,
  from: string,
  to: string,
  page: number,
) {
  try {
    const where: Prisma.OrderWhereInput = { userId }
    if (status && status !== 'all') {
      where.status = status as Prisma.EnumOrderStatusFilter
    }
    if (from) {
      where.createdAt = { ...((where.createdAt as object) ?? {}), gte: new Date(from) }
    }
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt = { ...((where.createdAt as object) ?? {}), lte: toDate }
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.order.count({ where }),
    ])
    return { orders, total }
  } catch (error) {
    console.error('[Orders] 주문 목록 조회 실패:', error instanceof Error ? error.message : error)
    throw error
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

export default async function OrdersPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const params = await searchParams
  const status = params.status ?? 'all'
  const from = params.from ?? ''
  const to = params.to ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { orders, total } = await getOrders(session.user.id, status, from, to, page)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildHref = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams()
    if (status && status !== 'all') sp.set('status', status)
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
    sp.set('page', '1')
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    const str = sp.toString()
    return `/orders${str ? `?${str}` : ''}`
  }

  const pageHref = (p: number) => {
    const sp = new URLSearchParams()
    if (status && status !== 'all') sp.set('status', status)
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
    sp.set('page', String(p))
    return `/orders?${sp.toString()}`
  }

  return (
    <div className="page-enter pb-24">
      {/* 페이지 헤더 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">📦 주문 내역</h1>
        <p className="text-sm text-gray-500 mt-1">최근 주문을 확인하세요</p>
      </div>

      {/* 계좌 정보 안내 */}
      <div className="px-4 py-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
          <p className="text-center text-xs text-orange-600 font-semibold mb-1">💳 입금 계좌 안내</p>
          <p className="text-center text-base font-bold text-gray-900">{BANK_ACCOUNT_INFO}</p>
          <p className="text-center text-xs text-gray-500 mt-1">예금주: 오늘의귤</p>
        </div>
      </div>

      {/* 상태 필터 탭 */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildHref({ status: tab.key, page: '1' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 날짜 필터 */}
      <form method="GET" action="/orders" className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex gap-2 items-center flex-wrap">
        {status !== 'all' && <input type="hidden" name="status" value={status} />}
        <input type="hidden" name="page" value="1" />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
        />
        <span className="text-xs text-gray-400">~</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
        />
        <button type="submit" className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600">
          적용
        </button>
        {(from || to) && (
          <Link href={buildHref({ from: '', to: '' })} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100">
            초기화
          </Link>
        )}
      </form>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500">
              {status !== 'all' || from || to
                ? '해당 조건의 주문이 없어요.'
                : '아직 주문 내역이 없어요.\n첫 주문을 해보세요!'}
            </p>
            <Link
              href="/products"
              className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white font-semibold rounded-full"
            >
              상품 보러가기
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">총 {total.toLocaleString()}건</p>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* 주문 헤더 */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        주문번호: {order.id.slice(-8).toUpperCase()}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* 주문 상품 */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                        🍊
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {order.items[0]?.product.name}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                        </p>
                        <p className="text-lg font-bold text-orange-500 mt-0.5">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 상태별 안내 메시지 */}
                  {order.status === 'DRAFT' && (
                    <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
                      <p className="text-xs text-yellow-700 text-center">
                        💡 입금 후 &quot;입금확인 요청&quot; 버튼을 눌러주세요
                      </p>
                    </div>
                  )}
                  {order.status === 'DEPOSIT_REQUESTED' && (
                    <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
                      <p className="text-xs text-blue-700 text-center">
                        ⏳ 입금 확인 중입니다. 잠시만 기다려주세요.
                      </p>
                    </div>
                  )}
                  {order.status === 'PAYMENT_CONFIRMED' && (
                    <div className="px-4 py-2 bg-green-50 border-t border-green-100">
                      <p className="text-xs text-green-700 text-center">
                        ✅ 입금이 확인되었습니다. 배송 준비 중입니다.
                      </p>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 py-2.5 text-center text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      상세보기
                    </Link>
                    {order.status === 'DRAFT' && (
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        입금확인 요청
                      </Link>
                    )}
                    {['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(order.status) && (
                      <Link
                        href={`/orders/${order.id}?tab=shipping`}
                        className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-green-500 rounded-xl hover:bg-green-600 transition-colors"
                      >
                        배송정보 조회
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
                    이전
                  </Link>
                )}
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link href={pageHref(page + 1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
                    다음
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
