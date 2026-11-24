import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { ShippingWorkbookManager } from '@/components/ShippingWorkbookManager'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30
const readyWhere: Prisma.OrderItemWhereInput = {
  shippedAt: null,
  order: { status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING'] } },
}

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; status?: string; page?: string }>
}

// 주문일 범위는 한국 시간 기준이며 종료일도 포함합니다.
function koreanDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00+09:00`)
  return Number.isNaN(parsed.getTime()) || new Date(parsed.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) !== value
    ? null : parsed
}

function itemStatus(item: { shippedAt: Date | null; deliveredAt: Date | null; order: { status: string } }) {
  if (item.deliveredAt) return '배송완료'
  if (item.shippedAt) return '배송중'
  if (['PAYMENT_CONFIRMED', 'SHIPPING'].includes(item.order.status)) return '배송 준비'
  return {
    DRAFT: '주문 작성',
    DEPOSIT_REQUESTED: '입금 대기',
    CANCELED: '취소',
    DELIVERED: '배송완료',
  }[item.order.status] ?? item.order.status
}

export default async function AdminShippingPage({ searchParams }: PageProps) {
  if (!await adminAuth()) redirect('/')

  const params = await searchParams
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const fromValue = koreanDate(params.from) ? params.from! : today
  const toValue = koreanDate(params.to) ? params.to! : today
  const from = koreanDate(fromValue)!
  const to = koreanDate(toValue)!
  const status = params.status === 'all' ? 'all' : 'ready'
  const parsedPage = Number(params.page)
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const where: Prisma.OrderItemWhereInput = status === 'ready' ? { ...readyWhere } : {}
  where.order = {
    ...(status === 'ready' ? { status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING'] as const } } : {}),
    createdAt: { gte: from, lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) },
  }

  const [pendingCount, total, items] = await Promise.all([
    prisma.orderItem.count({ where: readyWhere }),
    prisma.orderItem.count({ where }),
    prisma.orderItem.findMany({
      where,
      select: {
        id: true, quantity: true, recipientName: true, recipientPhone: true,
        recipientAddressBase: true, recipientAddressDetail: true, trackingNumber: true,
        shippedAt: true, deliveredAt: true,
        product: { select: { name: true } },
        order: { select: { id: true, createdAt: true, status: true } },
      },
      orderBy: [{ order: { createdAt: 'desc' } }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams()
    query.set('from', fromValue)
    query.set('to', toValue)
    if (status === 'all') query.set('status', 'all')
    query.set('page', String(nextPage))
    return `/admin/shipping?${query.toString()}`
  }

  return (
    <div className="p-4 md:p-8 w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">📦 배송 작업</h1>
      <p className="text-sm text-gray-600 mb-6">미발송 목록을 엑셀로 받고, CJ 운송장번호를 한 번에 등록합니다.</p>
      <ShippingWorkbookManager pendingCount={pendingCount} />

      <section className="mt-6 bg-white rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-lg mb-4">배송 상품 조회</h2>
        <form method="GET" action="/admin/shipping" className="flex flex-wrap items-end gap-3 mb-5">
          <label className="text-sm text-gray-700">
            <span className="block mb-1">주문일 시작</span>
            <input type="date" name="from" key={fromValue} defaultValue={fromValue}
              className="px-3 py-2 border border-gray-200 rounded-lg" />
          </label>
          <label className="text-sm text-gray-700">
            <span className="block mb-1">주문일 종료</span>
            <input type="date" name="to" key={toValue} defaultValue={toValue}
              className="px-3 py-2 border border-gray-200 rounded-lg" />
          </label>
          <label className="text-sm text-gray-700">
            <span className="block mb-1">상태</span>
            <select name="status" defaultValue={status} className="px-3 py-2 border border-gray-200 rounded-lg">
              <option value="ready">배송 준비</option>
              <option value="all">전체</option>
            </select>
          </label>
          <button type="submit" className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg">조회</button>
          <Link href="/admin/shipping" className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg">초기화</Link>
        </form>
        <p className="text-sm text-gray-600 mb-3">조회 결과 {total.toLocaleString()}건</p>
        {items.length === 0 ? (
          <p className="py-10 text-center text-gray-500">해당 조건의 배송 상품이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-3 text-left whitespace-nowrap">주문일</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">주문번호</th>
                  <th className="px-3 py-3 text-left">상품</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">받는 분</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">전화번호</th>
                  <th className="px-3 py-3 text-left">주소</th>
                  <th className="px-3 py-3 text-left">상세주소</th>
                  <th className="px-3 py-3 text-right whitespace-nowrap">수량</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">상태</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">운송장번호</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 whitespace-nowrap">{item.order.createdAt.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{item.order.id.slice(-8).toUpperCase()}</td>
                    <td className="px-3 py-3 min-w-40">{item.product.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{item.recipientName}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{item.recipientPhone}</td>
                    <td className="px-3 py-3 min-w-48">{item.recipientAddressBase}</td>
                    <td className="px-3 py-3 min-w-32">{item.recipientAddressDetail || '—'}</td>
                    <td className="px-3 py-3 text-right">{item.quantity}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{itemStatus(item)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{item.trackingNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <nav aria-label="배송 상품 페이지" className="flex justify-center items-center gap-4 mt-5 text-sm">
            {page > 1 && <Link href={pageHref(page - 1)} className="text-orange-600">이전</Link>}
            <span>{page} / {totalPages}</span>
            {page < totalPages && <Link href={pageHref(page + 1)} className="text-orange-600">다음</Link>}
          </nav>
        )}
      </section>
    </div>
  )
}
