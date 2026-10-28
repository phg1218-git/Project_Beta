import { notFound, redirect } from 'next/navigation'
import { getStoreSettings } from '@/lib/store-settings'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function PolicyPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const settings = await getStoreSettings()
  const policy = type === 'terms' ? settings.terms : type === 'privacy' ? settings.privacyPolicy : ''
  if (!policy && type === 'privacy') redirect('/privacy')
  if (!policy) notFound()
  return (
    <div className="page-enter">
      <PageHeader title={type === 'terms' ? '이용약관' : '개인정보처리방침'} />
      <div className="px-4 py-6">
        <article className="bg-white rounded-2xl shadow-sm p-5 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {policy}
        </article>
      </div>
    </div>
  )
}
