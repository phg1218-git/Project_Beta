// /admin 페이지 — 관리자 대시보드 메인
// role: ADMIN만 접근 가능 (middleware에서 처리)

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { AdminExpireButton } from '@/components/AdminExpireButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDashboardStats() {
  try {
    const [
      totalOrders,
      pendingOrders,
      totalProducts,
      totalMembers,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'DEPOSIT_REQUESTED' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
    ])

    // 이번 달 수익 계산
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] },
        paidAt: { gte: startOfMonth },
      },
    })

    return {
      totalOrders,
      pendingOrders,
      totalProducts,
      totalMembers,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      recentOrders,
    }
  } catch (error) {
    console.error('[Admin] 대시보드 통계 조회 실패:', error instanceof Error ? error.message : error)
    // DB 장애를 조용히 숨기지 않음 — 호출자가 error.tsx로 처리하게 throw
    throw error
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  const statCards = [
    { label: '총 주문', value: stats.totalOrders, icon: '📦', color: 'bg-blue-500', href: '/admin/orders' },
    { label: '입금 대기', value: stats.pendingOrders, icon: '⏳', color: 'bg-yellow-500', href: '/admin/orders' },
    { label: '등록 상품', value: stats.totalProducts, icon: '🍊', color: 'bg-orange-500', href: '/admin/products' },
    { label: '전체 회원', value: stats.totalMembers, icon: '👥', color: 'bg-green-500', href: '/admin/members' },
  ]

  return (
    <div className="p-4 md:p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-500 mt-1">오늘의귤 관리 시스템</p>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-xl`}>
                {card.icon}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">
              {card.value.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* 이번 달 수익 */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-400 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">이번 달 수익</p>
            <p className="text-3xl md:text-4xl font-bold mt-1">
              {stats.monthlyRevenue.toLocaleString()}원
            </p>
          </div>
          <Link
            href="/admin/revenue"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            상세보기 →
          </Link>
        </div>
      </div>

      {/* 만료 주문 정리 */}
      <div className="mb-8 p-4 bg-white rounded-xl shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-gray-900">만료 주문 자동취소</p>
          <p className="text-xs text-gray-500 mt-0.5">
            입금기한이 지난 DRAFT/입금확인요청 주문을 취소하고 재고를 복구합니다.
          </p>
        </div>
        <AdminExpireButton />
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickAction href="/admin/orders" icon="📋" label="주문 관리" desc="입금확인 · 배송처리" />
        <QuickAction href="/admin/products" icon="🍊" label="상품 관리" desc="등록 · 수정 · 삭제" />
        <QuickAction href="/admin/revenue" icon="💰" label="수익 통계" desc="일별 · 주별 · 월별" />
        <QuickAction href="/admin/members" icon="👥" label="회원 관리" desc="회원 조회 · 관리" />
        <QuickAction href="/admin/logs" icon="🗒️" label="액션 로그" desc="관리자 이력 조회" />
      </div>

      {/* 최근 주문 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">최근 주문</h2>
          <Link href="/admin/orders" className="text-sm text-orange-500 hover:text-orange-600">
            전체보기 →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {stats.recentOrders.length > 0 ? (
            stats.recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{order.user?.name || '알 수 없음'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{order.totalAmount.toLocaleString()}원</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              최근 주문이 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label,
  desc,
}: {
  href: string
  icon: string
  label: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
    >
      <span className="text-3xl">{icon}</span>
      <p className="font-bold text-gray-900 mt-2">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: '입금요청 전', className: 'bg-gray-100 text-gray-600' },
    DEPOSIT_REQUESTED: { label: '입금확인 요청', className: 'bg-yellow-100 text-yellow-700' },
    PAYMENT_CONFIRMED: { label: '배송 준비', className: 'bg-blue-100 text-blue-700' },
    SHIPPING: { label: '배송 중', className: 'bg-orange-100 text-orange-700' },
    DELIVERED: { label: '배송 완료', className: 'bg-green-100 text-green-700' },
    CANCELED: { label: '취소', className: 'bg-red-100 text-red-600' },
  }
  const { label, className } = config[status] || config.DRAFT
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
