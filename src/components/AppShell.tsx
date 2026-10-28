'use client'

import { usePathname } from 'next/navigation'

// 고객 화면은 PC에서도 모바일 앱처럼 가운데 단일 컬럼(--app-max)으로 표시한다.
// 관리자 화면은 표·통계가 많아 화면 전체 폭을 사용한다.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const wide = pathname === '/admin' || pathname.startsWith('/admin/')
  return (
    <div className="app-shell" data-wide={wide ? '' : undefined}>
      {children}
    </div>
  )
}
