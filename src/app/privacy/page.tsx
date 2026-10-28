import type { Metadata } from 'next'
import { getStoreSettingsForDisplay } from '@/lib/store-settings'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '오늘의귤 개인정보처리방침',
}

export default async function PrivacyPage() {
  const settings = await getStoreSettingsForDisplay()
  return (
    <div className="page-enter">
      <PageHeader title="개인정보처리방침" />
      <div className="px-4 py-6">
        <article className="bg-white rounded-2xl shadow-sm p-5 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {settings.privacyPolicy || '개인정보처리방침을 준비 중입니다.'}
        </article>
      </div>
    </div>
  )
}
