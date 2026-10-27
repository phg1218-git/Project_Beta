import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { OrangeTopHeader } from '@/components/OrangeTopHeader'
import { CitrusBottomTabBar } from '@/components/CitrusBottomTabBar'
import { SessionProvider } from 'next-auth/react'
import { getStoreSettings } from '@/lib/store-settings'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.AUTH_URL || 'https://dailycitrus.netlify.app'
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings()
  const description = settings.introduction.slice(0, 160) || '우리 가족이 키운 귤을 만나보세요.'
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.farmName, template: `%s | ${settings.farmName}` },
    description,
    openGraph: { type: 'website', locale: 'ko_KR', url: SITE_URL, siteName: settings.farmName, title: settings.farmName, description },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // iPhone notch/홈바 safe-area 대응
  themeColor: '#FF8A00',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getStoreSettings()
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
          <OrangeTopHeader farmName={settings.farmName} />

          {/* 페이지 콘텐츠 */}
          <main>{children}</main>

          {/* 하단 탭바: 모바일/데스크탑 모두 표시 */}
          <CitrusBottomTabBar />
        </SessionProvider>
      </body>
    </html>
  )
}
