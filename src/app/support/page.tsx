import { getStoreSettings } from '@/lib/store-settings'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const settings = await getStoreSettings()
  return <div className="max-w-3xl mx-auto px-5 py-8 pb-28 space-y-8">
    <h1 className="text-2xl font-bold">배송·고객 안내</h1>
    <section className="space-y-2"><h2 className="font-bold">배송비</h2>
      <p>주문 1건당 {settings.shippingFee === 0 ? '무료배송' : formatPrice(settings.shippingFee)}</p>
      {settings.shippingNotice && <p className="whitespace-pre-wrap">{settings.shippingNotice}</p>}
    </section>
    {settings.damagePolicy && <section className="space-y-2"><h2 className="font-bold">파손·부패 및 교환·환불 안내</h2><p className="whitespace-pre-wrap">{settings.damagePolicy}</p></section>}
    {settings.contactPhone && <section className="space-y-2"><h2 className="font-bold">고객센터</h2><a className="underline" href={`tel:${settings.contactPhone.replace(/[^+0-9]/g, '')}`}>{settings.contactPhone}</a><p>{settings.contactHours}</p></section>}
    <div className="flex gap-4">
      {settings.terms && <Link className="underline" href="/policies/terms">이용약관</Link>}
      {settings.privacyPolicy && <Link className="underline" href="/policies/privacy">개인정보처리방침</Link>}
    </div>
    <Link href="/products" className="inline-block text-orange-600 underline">상품 둘러보기</Link>
  </div>
}
