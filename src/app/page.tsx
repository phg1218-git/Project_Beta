import Link from 'next/link'
import { getStoreSettings } from '@/lib/store-settings'
import { StoreFooter } from '@/components/StoreFooter'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const settings = await getStoreSettings()
  return (
    <div className="page-enter">
      <section className="px-6 py-14 md:py-20 bg-orange-50">
        <div className="max-w-3xl mx-auto">
          {settings.region && <p className="text-sm text-orange-700 mb-3">{settings.region}</p>}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">{settings.farmName}</h1>
          <p className="text-lg text-gray-700 mb-8">우리 가족이 키운 귤을 만나보세요.</p>
          <Link href="/products" className="inline-block px-6 py-3 bg-orange-600 text-white font-bold rounded-lg">판매 중인 귤 보기 →</Link>
        </div>
      </section>
      {settings.introduction && <section className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-xl font-bold mb-4">우리 농장 이야기</h2>
        <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{settings.introduction}</p>
      </section>}
      {settings.gapCertified && settings.gapCertification && <section className="max-w-3xl mx-auto px-6 pb-10">
        <h2 className="text-xl font-bold mb-3">GAP 인증 안내</h2>
        <p className="whitespace-pre-wrap text-gray-700">{settings.gapCertification}</p>
      </section>}
      {settings.shippingNotice && <section className="max-w-3xl mx-auto px-6 pb-10">
        <h2 className="text-xl font-bold mb-3">출고·배송 안내</h2>
        <p className="whitespace-pre-wrap text-gray-700">{settings.shippingNotice}</p>
      </section>}
      <StoreFooter settings={settings} />
    </div>
  )
}
