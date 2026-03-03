'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const TABS = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/products', label: '상품', icon: '🍊' },
  { href: '/cart', label: '장바구니', icon: '🛒' },
  { href: '/orders', label: '주문조회', icon: '📦' },
]

export function CitrusBottomTabBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    if (session?.user) {
      fetchCartCount()
    } else {
      setCartCount(0)
    }
  }, [session, pathname])

  const fetchCartCount = async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        setCartCount(data.length)
      }
    } catch {
      setCartCount(0)
    }
  }

  // 관리자 페이지에서는 숨김
  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <nav
      role="navigation"
      aria-label="하단 탭 메뉴"
      className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-gray-200 flex z-[200] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== '/' && pathname.startsWith(tab.href))

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative no-underline"
          >
            {/* Active 인디케이터 */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b transition-colors ${
                isActive ? 'bg-orange-500' : 'bg-transparent'
              }`}
            />

            {/* 아이콘 */}
            <span
              className={`text-[22px] leading-none relative transition-transform ${
                isActive ? 'scale-110' : 'scale-100'
              }`}
            >
              {tab.icon}
              {/* 장바구니 뱃지 */}
              {tab.href === '/cart' && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-2 w-[17px] h-[17px] bg-yellow-400 rounded-full text-[10px] font-extrabold text-gray-900 flex items-center justify-center border-2 border-white">
                  {cartCount > 99 ? '99' : cartCount}
                </span>
              )}
            </span>

            {/* 라벨 */}
            <span
              className={`text-[10px] transition-colors ${
                isActive
                  ? 'font-extrabold text-orange-500'
                  : 'font-semibold text-gray-500'
              }`}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
