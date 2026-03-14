import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getRevenueStats() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // 이번 달 수익
    const thisMonthRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] },
        paidAt: { gte: startOfMonth },
      },
    })

    // 지난 달 수익
    const lastMonthRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] },
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    })

    // 전체 수익
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] },
      },
    })

    // 최근 주문 10건
    const recentOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] },
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
    })

    return {
      thisMonth: {
        revenue: thisMonthRevenue._sum.totalAmount || 0,
        count: thisMonthRevenue._count,
      },
      lastMonth: {
        revenue: lastMonthRevenue._sum.totalAmount || 0,
        count: lastMonthRevenue._count,
      },
      total: {
        revenue: totalRevenue._sum.totalAmount || 0,
        count: totalRevenue._count,
      },
      recentOrders,
    }
  } catch {
    return {
      thisMonth: { revenue: 0, count: 0 },
      lastMonth: { revenue: 0, count: 0 },
      total: { revenue: 0, count: 0 },
      recentOrders: [],
    }
  }
}

export default async function AdminRevenuePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const stats = await getRevenueStats()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💰 수익 통계</h1>
        <p className="text-gray-500 mt-1">매출 현황을 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-orange-500 to-yellow-400 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm">이번 달 매출</p>
          <p className="text-3xl font-bold mt-2">{formatPrice(stats.thisMonth.revenue)}</p>
          <p className="text-white/80 text-sm mt-1">{stats.thisMonth.count}건</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">지난 달 매출</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{formatPrice(stats.lastMonth.revenue)}</p>
          <p className="text-gray-500 text-sm mt-1">{stats.lastMonth.count}건</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">누적 매출</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{formatPrice(stats.total.revenue)}</p>
          <p className="text-gray-500 text-sm mt-1">총 {stats.total.count}건</p>
        </div>
      </div>

      {/* 최근 결제 내역 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">최근 결제 내역</h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            결제 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{order.user?.name || '알 수 없음'}</p>
                  <p className="text-sm text-gray-500">
                    {order.paidAt 
                      ? new Date(order.paidAt).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'
                    }
                  </p>
                </div>
                <p className="font-bold text-orange-500">{formatPrice(order.totalAmount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}