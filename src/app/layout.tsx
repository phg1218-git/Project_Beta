import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { OrangeTopHeader } from '@/components/OrangeTopHeader'
import { CitrusBottomTabBar } from '@/components/CitrusBottomTabBar'
import { SessionProvider } from 'next-auth/react'

const SITE_URL = process.env.AUTH_URL || 'https://dailycitrus.netlify.app'
const OG_IMAGE = `${SITE_URL}/og-image.png`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '오늘의귤 — 제주 산지 직송 감귤',
    template: '%s | 오늘의귤',
  },
  description: '제주 산지 직송 귤 판매 서비스 — 오늘 수확한 귤, 내일 문 앞에. 당도 보장, 익일 배송, GAP 인증.',
  keywords: ['제주귤', '감귤', '산지직송', '오늘의귤', '귤 선물', 'dailycitrus'],
  authors: [{ name: '오늘의귤' }],
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '오늘의귤',
    title: '오늘의귤 — 제주 산지 직송 감귤',
    description: '오늘 수확한 제주 귤을 내일 문 앞에서 만나보세요.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: '오늘의귤' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '오늘의귤 — 제주 산지 직송 감귤',
    description: '오늘 수확한 제주 귤을 내일 문 앞에서 만나보세요.',
    images: [OG_IMAGE],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // iPhone notch/홈바 safe-area 대응
  themeColor: '#FF8A00',
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
