// middleware.ts
// Edge Runtime 호환 미들웨어
// Prisma 사용 불가 → JWT 세션만 체크

import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname

  // 정적 파일 및 API 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 공개 경로
  const publicPaths = ['/', '/login', '/products']
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  const isLoggedIn = !!session?.user

  // 관리자 페이지 접근 제어
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', nextUrl.origin))
    }
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', nextUrl.origin))
    }
  }

  // 비로그인 사용자가 비공개 경로 접근 시
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
