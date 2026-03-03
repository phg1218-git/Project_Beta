import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth(async (req) => {
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

  // 비로그인 사용자 비공개 경로 접근 시
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 로그인 했지만 프로필 미완성 → /profile/setup으로 강제 이동
  // (profile/setup 페이지 내부에서 DB 체크 후 이미 정보 있으면 메인으로 보냄)
  if (isLoggedIn && !session?.user?.profileComplete) {
    const allowedPaths = ['/profile/setup', '/login', '/', '/products']
    const isAllowed = allowedPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    )
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/profile/setup', nextUrl.origin))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}