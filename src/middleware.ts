// middleware.ts
// 설계문서 6-4 기반
// - 비로그인: 메인·로그인만 접근 가능
// - 로그인 + 프로필 미완성: /profile/setup 리다이렉트
// - ADMIN: /admin/* 접근 가능

export { auth as default } from '@/auth'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NOTE: auth() wrapper를 사용하는 실제 구현은 auth.ts 설정 후 아래처럼 교체:
//
// import { auth } from '@/auth'
// export default auth((req) => {
//   const { nextUrl, auth: session } = req
//   const isLoggedIn = !!session
//   const isProfileSetup = nextUrl.pathname === '/profile/setup'
//   const isPublic = ['/', '/login', '/products'].some(p => nextUrl.pathname.startsWith(p))
//
//   if (!isLoggedIn && !isPublic) return NextResponse.redirect(new URL('/login', nextUrl))
//   if (isLoggedIn && !session?.user?.profileComplete && !isProfileSetup && !isPublic)
//     return NextResponse.redirect(new URL('/profile/setup', nextUrl))
//   if (nextUrl.pathname.startsWith('/admin') && session?.user?.role !== 'ADMIN')
//     return NextResponse.redirect(new URL('/products', nextUrl))
//
//   return NextResponse.next()
// })

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
