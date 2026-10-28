'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function OrangeTopHeader() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  // 사이트 안에서 이동한 횟수 — 링크로 바로 들어온 경우 뒤로가기가 사이트를 벗어나지 않도록
  const visits = useRef(0)
  const [showMenu, setShowMenu] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const isLoggedIn = status === 'authenticated'
  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    if (isLoggedIn) {
      fetchCartCount()
      window.addEventListener('cart-updated', fetchCartCount)
      return () => window.removeEventListener('cart-updated', fetchCartCount)
    } else {
      setCartCount(0)
    }
  }, [isLoggedIn, pathname])

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

  useEffect(() => {
    visits.current += 1
  }, [pathname])

  const goBack = () => {
    if (visits.current > 1) {
      router.back()
      return
    }
    // 이전 화면이 없으면 한 단계 위 경로로 (예: /orders/abc → /orders)
    const parent = pathname.replace(/\/[^/]+\/?$/, '') || '/'
    router.push(parent === '/policies' ? '/support' : parent)
  }

  // 로그인 페이지에서는 헤더 숨김
  if (pathname === '/login') return null

  return (
    <header className="sticky top-0 z-[100] h-14 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
        {/* 뒤로가기 (홈 제외) */}
        {pathname !== '/' && (
          <button
            type="button"
            onClick={goBack}
            aria-label="뒤로 가기"
            className="-ml-2 w-10 h-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* 로고 */}
        <Link
          href="/"
          className="flex items-center gap-1.5 no-underline"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
        >
          <span className="text-2xl">🍊</span>
          <span className="text-lg font-black text-orange-500 tracking-tight">
            오늘의귤
          </span>
        </Link>
        </div>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2">
          {/* 장바구니 */}
          <Link
            href="/cart"
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="장바구니"
          >
            <span className="text-xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-yellow-400 rounded-full text-[10px] font-bold text-gray-900 flex items-center justify-center">
                {cartCount > 99 ? '99' : cartCount}
              </span>
            )}
          </Link>

          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden items-center justify-center px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  ⚙️ 관리자
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 transition-colors"
                  aria-label="프로필 메뉴"
                >
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt="프로필"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-semibold text-sm truncate">
                          {session?.user?.name || '회원'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session?.user?.email}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        <span>👤</span> 프로필 수정
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <span>⚙️</span> 관리자
                        </Link>
                      )}
                      <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <span>🚪</span> 로그아웃
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
