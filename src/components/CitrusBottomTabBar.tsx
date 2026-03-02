'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

// CitrusBottomTabBar
// ✅ position: fixed + z-index: 200 → 모바일/데스크탑 모두 항상 표시
// ✅ padding-bottom: env(safe-area-inset-bottom) → 아이폰 홈바 영역 보호
// ✅ 데스크탑에서 숨기지 않음 (display:none 미적용)

const TABS = [
  { href: '/products', label: '상품조회', icon: '🍊' },
  { href: '/cart',     label: '장바구니', icon: '🛒', badge: 2 },
  { href: '/orders',   label: '주문조회', icon: '📦' },
  { href: '/profile',  label: '프로필수정', icon: '👤' },
] as const

export function CitrusBottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      role="navigation"
      aria-label="하단 탭 메뉴"
      style={{
        /* ✅ fixed로 항상 화면 하단에 고정 */
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        /* ✅ 탭바 자체 높이는 64px 고정 */
        height: 'var(--bottom-nav-height)',
        /* ✅ iPhone safe-area: 홈바 영역만큼 내부 padding 추가 */
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--neutral-200)',
        display: 'flex',
        /* ✅ z-index: 200 → 헤더(100), cart-sticky(150)보다 위 */
        zIndex: 200,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
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
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              position: 'relative',
              textDecoration: 'none',
              padding: '6px 0',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Active 인디케이터 (상단 줄) */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 32, height: 3,
                background: isActive ? 'var(--primary)' : 'transparent',
                borderRadius: '0 0 4px 4px',
                transition: 'background 0.2s',
              }}
            />

            {/* 아이콘 */}
            <span
              style={{
                fontSize: 22,
                lineHeight: 1,
                transform: isActive ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.2s',
                position: 'relative',
              }}
            >
              {tab.icon}
              {/* 장바구니 뱃지 */}
              {'badge' in tab && tab.badge && tab.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2, right: -8,
                    width: 17, height: 17,
                    background: 'var(--secondary)',
                    borderRadius: '50%',
                    fontSize: 10, fontWeight: 800, color: '#1A1A1A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </span>

            {/* 라벨 */}
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'color 0.2s',
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
