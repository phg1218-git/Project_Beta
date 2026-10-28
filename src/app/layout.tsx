import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import '@/styles/globals.css'
import { OrangeTopHeader } from '@/components/OrangeTopHeader'
import { CitrusBottomTabBar } from '@/components/CitrusBottomTabBar'
import { SessionProvider } from 'next-auth/react'
import { AppShell } from '@/components/AppShell'

// Google AdSense Publisher ID — 애드센스 관리자 페이지에서 확인 후 교체하세요
// 예: ca-pub-1234567890123456
const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || ''

const SITE_URL = process.env.AUTH_URL || 'https://dailycitrus.netlify.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '오늘의귤 — 제주 산지 직송 감귤',
    template: '%s | 오늘의귤',
  },
  description: '제주 조천읍 산지 직송 귤 판매 서비스 — 입도 1세대 가족 농장에서 키운 귤을 농장에서 직접 포장해 보내드립니다.',
  keywords: ['제주귤', '감귤', '산지직송', '오늘의귤', '조천읍귤', '귤 선물', 'dailycitrus'],
  authors: [{ name: '오늘의귤' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '오늘의귤',
    title: '오늘의귤 — 제주 산지 직송 감귤',
    description: '제주 조천읍 가족 농장에서 직접 보내는 귤을 만나보세요.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '오늘의귤 — 제주 산지 직송 감귤',
    description: '제주 조천읍 가족 농장에서 직접 보내는 귤을 만나보세요.',
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
        {/* Google AdSense — NEXT_PUBLIC_ADSENSE_PUB_ID 환경변수 설정 필요 */}
        {ADSENSE_PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <SessionProvider>
          <AppShell>
            {/* 상단 헤더 */}
            <OrangeTopHeader />

            {/* 페이지 콘텐츠 */}
            <main>{children}</main>

            {/* 하단 탭바: 컬럼 폭에 맞춰 표시 */}
            <CitrusBottomTabBar />
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  )
}
