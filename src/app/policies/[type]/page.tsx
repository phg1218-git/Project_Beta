import { notFound } from 'next/navigation'
import { getStoreSettings } from '@/lib/store-settings'

export const dynamic = 'force-dynamic'

export default async function PolicyPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const settings = await getStoreSettings()
  const policy = type === 'terms' ? settings.terms : type === 'privacy' ? settings.privacyPolicy : ''
  if (!policy) notFound()
  return <article className="max-w-3xl mx-auto px-5 py-8 pb-28">
    <h1 className="text-2xl font-bold mb-6">{type === 'terms' ? '이용약관' : '개인정보처리방침'}</h1>
    <p className="whitespace-pre-wrap break-words leading-relaxed">{policy}</p>
  </article>
}
