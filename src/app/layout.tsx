import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { OrangeTopHeader } from '@/components/OrangeTopHeader'
import { CitrusBottomTabBar } from '@/components/CitrusBottomTabBar'

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
        {/* Pretendard CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        {/* 상단 헤더 */}
        <OrangeTopHeader />

        {/* 페이지 콘텐츠 */}
        <main>{children}</main>

        {/* 하단 탭바: 모바일/데스크탑 모두 표시 */}
        <CitrusBottomTabBar />
      </body>
    </html>
  )
}
