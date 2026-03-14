import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { OrangeTopHeader } from '@/components/OrangeTopHeader'
import { CitrusBottomTabBar } from '@/components/CitrusBottomTabBar'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: '오늘의귤 🍊',
  description: '제주 산지 직송 귤 판매 서비스 — 오늘 수확한 귤, 내일 문 앞에',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // iPhone notch/홈바 safe-area 대응
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard CDN — variable font dynamic subset (훨씬 가볍고 빠름) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <SessionProvider>
          {/* 상단 헤더 */}
          <OrangeTopHeader />

          {/* 페이지 콘텐츠 */}
          <main>{children}</main>

          {/* 하단 탭바: 모바일/데스크탑 모두 표시 */}
          <CitrusBottomTabBar />
        </SessionProvider>
      </body>
    </html>
  )
}
