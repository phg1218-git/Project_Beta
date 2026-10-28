import { getStoreSettingsForDisplay } from '@/lib/store-settings'
import { formatPrice } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default async function SupportPage() {
  const settings = await getStoreSettingsForDisplay()
  return (
    <div className="page-enter">
      <PageHeader title="배송·고객 안내" description="배송비, 교환·환불, 고객센터 안내" />
      <div className="px-4 py-6 space-y-4">
        <Card title="배송비">
          <p>주문 1건당 {settings.shippingFee === 0 ? '무료배송' : formatPrice(settings.shippingFee)}</p>
          {settings.shippingNotice ? (
            <p className="whitespace-pre-wrap">{settings.shippingNotice}</p>
          ) : (
            <p>입금이 확인된 주문부터 순차적으로 포장해 택배로 발송합니다. 발송 후 주문 상세에서 배송사와 송장번호를 확인할 수 있습니다.</p>
          )}
        </Card>
        <Card title="파손·부패 및 교환·환불 안내">
          {settings.damagePolicy ? (
            <p className="whitespace-pre-wrap">{settings.damagePolicy}</p>
          ) : (
            <p>상품에 파손·부패 등 이상이 있으면 상자와 상품 사진, 주문번호를 준비해 고객센터로 알려주세요. 청약철회·교환·환불은 관계 법령과 이용약관에 따릅니다.</p>
          )}
          <p className="text-gray-500">입금확인 요청 전에는 주문 상세에서 직접 취소할 수 있고, 그 이후에는 고객센터로 취소를 요청해주세요.</p>
        </Card>
        <Card title="고객센터">
          {settings.contactPhone ? (
            <a className="font-semibold text-orange-600" href={`tel:${settings.contactPhone.replace(/[^+0-9]/g, '')}`}>
              {settings.contactPhone}
            </a>
          ) : (
            <p>연락처 준비 중</p>
          )}
          {settings.contactHours && <p className="text-gray-500">{settings.contactHours}</p>}
        </Card>
        <nav className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 text-sm">
          <Link className="flex justify-between px-5 py-4" href="/faq">자주 묻는 질문 <span className="text-gray-400">›</span></Link>
          {settings.terms && <Link className="flex justify-between px-5 py-4" href="/policies/terms">이용약관 <span className="text-gray-400">›</span></Link>}
          <Link className="flex justify-between px-5 py-4" href={settings.privacyPolicy ? '/policies/privacy' : '/privacy'}>
            개인정보처리방침 <span className="text-gray-400">›</span>
          </Link>
        </nav>
        <Link
          href="/products"
          className="block w-full py-3.5 text-center bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
        >
          상품 둘러보기
        </Link>
      </div>
    </div>
  )
}
