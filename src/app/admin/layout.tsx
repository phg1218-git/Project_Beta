'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_MENUS = [
  { href: '/admin',          icon: '📊', label: '대시보드' },
  { href: '/admin/orders',   icon: '📋', label: '주문 조회' },
  { href: '/admin/products', icon: '🍊', label: '상품 관리' },
  { href: '/admin/revenue',  icon: '💰', label: '수익 통계' },
  { href: '/admin/members',  icon: '👥', label: '회원 관리' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 모바일 상단 네비게이션 */}
      <nav className="md:hidden bg-gray-900 text-white px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {ADMIN_MENUS.map((menu) => {
            const isActive = pathname === menu.href
            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{menu.icon}</span>
                <span>{menu.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="flex">
        {/* 데스크탑 사이드바 */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gray-900 text-white">
          {/* 관리자 로고 */}
          <div className="p-6 border-b border-gray-800">
            <Link href="/admin" className="flex items-center gap-2 no-underline">
              <span className="text-2xl">🍊</span>
              <div>
                <span className="text-lg font-bold text-yellow-400">오늘의귤</span>
                <span className="block text-xs text-gray-400">Admin Dashboard</span>
              </div>
            </Link>
          </div>

          {/* 메뉴 리스트 */}
          <nav className="flex-1 py-4">
            {ADMIN_MENUS.map((menu) => {
              const isActive = pathname === menu.href
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-yellow-400 border-l-4 border-yellow-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <span className="text-lg">{menu.icon}</span>
                  <span>{menu.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* 하단 링크 */}
          <div className="p-4 border-t border-gray-800">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
            >
              ← 사이트로 돌아가기
            </Link>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-h-screen">{children}</main>
      </div>
    </div>
  )
}
