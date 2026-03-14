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

  // 공개 경로 (비로그인도 접근 가능)
  const publicPaths = ['/', '/login', '/products']
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  const isLoggedIn = !!session?.user
  const isProfileComplete = session?.user?.profileComplete === true

  // 관리자 페이지 접근 제어
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', nextUrl.origin))
    }
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', nextUrl.origin))
    }
    return NextResponse.next()
  }

  // 로그인된 사용자가 /login 접근 시 리다이렉트
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/products', nextUrl.origin))
  }

  // 비로그인 사용자가 비공개 경로 접근 시 로그인 페이지로
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 로그인 했지만 프로필 미완성인 경우
  if (isLoggedIn && !isProfileComplete) {
    // /profile/setup, /login, /api 경로는 통과
    const allowedForIncompleteProfile = ['/profile/setup', '/login']
    const isAllowed = allowedForIncompleteProfile.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    )

    if (!isAllowed) {
      // 프로필 설정 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/profile/setup', nextUrl.origin))
    }
  }

  // 프로필 완성된 사용자가 /profile/setup 접근 시 상품 페이지로
  if (isLoggedIn && isProfileComplete && pathname === '/profile/setup') {
    return NextResponse.redirect(new URL('/products', nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}