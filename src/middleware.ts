import { safeReturnPath } from '@/lib/redirect'
import NextAuth from 'next-auth'

// Middleware only checks the signed login cookie; DB authorization runs on the server.
const { auth } = NextAuth({
  trustHost: true, providers: [], session: { strategy: 'jwt' },
  callbacks: { session({ session, token }) {
    session.user.profileComplete = token.profileComplete === true
    return session
  } },
})
import { NextResponse } from 'next/server'

export default auth(async (req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname

  // 정적 파일 및 API 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    // 확장자 없는 생성 이미지 (공유 미리보기·홈 화면 아이콘)
    pathname === '/opengraph-image' ||
    pathname === '/apple-icon'
  ) {
    return NextResponse.next()
  }

  // 공개 경로 (비로그인도 접근 가능)
  const publicPaths = ['/', '/login', '/products', '/about', '/faq', '/privacy', '/support', '/policies']
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  const isLoggedIn = !!session?.user
  const isProfileComplete = session?.user?.profileComplete === true

  // 로그인 했지만 프로필 미완성인 경우
  if (isLoggedIn && !isProfileComplete && !pathname.startsWith('/admin')) {
    // 홈·상품 둘러보기와 안내 페이지는 통과 — 장바구니·주문 등 회원 화면만 기본정보를 요구한다.
    // (주문 API도 profileComplete를 다시 검사한다)
    const allowedForIncompleteProfile = ['/', '/products', '/profile/setup', '/login', '/about', '/faq', '/privacy', '/support', '/policies']
    const isAllowed = allowedForIncompleteProfile.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    )

    if (!isAllowed) {
      // 프로필 설정 후 원래 가려던 곳으로 돌아가도록 callbackUrl 유지
      const setupUrl = new URL('/profile/setup', nextUrl.origin)
      setupUrl.searchParams.set('callbackUrl', pathname + nextUrl.search)
      return NextResponse.redirect(setupUrl)
    }
  }


  // 관리자 페이지 접근 제어
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', nextUrl.origin)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Current DB role is checked by the admin layout and each admin API.
    return NextResponse.next()
  }

  // 로그인된 사용자가 /login 접근 시 리다이렉트
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL(safeReturnPath(nextUrl.searchParams.get('callbackUrl')), nextUrl.origin))
  }

  // 비로그인 사용자가 비공개 경로 접근 시 로그인 페이지로
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname + nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // 프로필 완성된 사용자가 /profile/setup 접근 시 상품 페이지로
  if (isLoggedIn && isProfileComplete && pathname === '/profile/setup') {
    return NextResponse.redirect(new URL(safeReturnPath(nextUrl.searchParams.get('callbackUrl')), nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  // /api는 제외 — auth() 래퍼가 요청 시점의 (옛) 세션 쿠키를 응답에 다시 써서
  // /api/auth/session의 update() 결과(profileComplete 등)를 덮어쓰는 문제가 있었다.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}