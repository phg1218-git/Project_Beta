import type { Metadata } from 'next'
import Link from 'next/link'
import { getStoreSettingsForDisplay } from '@/lib/store-settings'
import { PageHeader } from '@/components/PageHeader'

// 연락처는 관리자 설정에서 읽으며 5분마다 갱신
export const revalidate = 300

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description:
    '오늘의귤 자주 묻는 질문(FAQ) — 배송, 결제, 재배, 보관, 교환·환불 등 궁금한 점을 한 번에 확인하세요.',
  openGraph: {
    title: '자주 묻는 질문 | 오늘의귤',
    description: '배송, 결제, 재배, 교환·환불 등 자주 묻는 질문 모음.',
  },
}

const FAQ_LIST = [
  {
    category: '배송',
    items: [
      {
        q: '배송은 얼마나 걸리나요?',
        a: '입금이 확인된 주문부터 순차적으로 포장해 택배로 발송합니다. 발송 일정은 배송·고객 안내 페이지에서 확인할 수 있고, 발송 후에는 주문 상세에서 배송사와 송장번호를 확인할 수 있습니다. 제주에서 출발하므로 날씨와 지역(도서산간 등)에 따라 배송이 더 걸릴 수 있습니다.',
      },
      {
        q: '배송비는 얼마인가요?',
        a: '배송비는 주문 1건 기준으로 적용되며, 현재 금액은 배송·고객 안내 페이지와 장바구니 주문 화면에서 확인할 수 있습니다.',
      },
      {
        q: '제주도에서도 배송이 되나요?',
        a: '네, 제주도 내 배송도 가능합니다. 현재 지역에 관계없이 같은 배송비가 적용됩니다.',
      },
      {
        q: '귤이 도착했는데 박스가 많이 눌렸어요.',
        a: '배송 중 파손이나 부패가 확인되면 상자와 귤 상태를 사진으로 남긴 뒤 고객센터(아래 연락처)로 연락해주세요. 확인 후 관계 법령과 이용약관에 따라 교환 또는 환불해드립니다. 신선식품이라 빨리 알려주실수록 확인이 쉽습니다.',
      },
    ],
  },
  {
    category: '상품과 재배',
    items: [
      {
        q: '수확 후 언제 보내주시나요?',
        a: '중간 유통 단계 없이 농장에서 수확한 귤을 직접 포장해 보내드립니다. 수확과 발송 일정은 날씨와 작업 상황에 따라 달라질 수 있으며, 배송·고객 안내 페이지에서 확인할 수 있습니다.',
      },
      {
        q: '귤은 얼마나 단가요?',
        a: '귤의 당도는 품종, 수확 시기, 그해 날씨에 따라 달라집니다. 조천읍은 일교차가 커서 당분이 잘 농축되는 편이며, 상품별 안내가 있는 경우 상품 상세에서 확인할 수 있습니다.',
      },
      {
        q: '농약은 얼마나 사용하나요?',
        a: '병해충 방제에 필요한 만큼만 농약을 사용하고 농약 안전사용기준을 지킵니다. 무농약·유기농 인증 상품은 아닙니다. 겉모양을 위한 착색제나 방부 처리는 하지 않아 귤 껍질이 고르지 않거나 투박해 보일 수 있습니다.',
      },
      {
        q: '보관 방법을 알려주세요.',
        a: '서늘하고 통풍이 잘 되는 곳에 보관해주세요. 비닐봉지보다는 망이나 종이박스가 좋고, 무른 귤은 바로 골라내야 다른 귤로 번지지 않습니다. 보관 기간은 귤 상태와 온도·습도에 따라 달라집니다.',
      },
    ],
  },
  {
    category: '결제',
    items: [
      {
        q: '결제 방법은 무엇인가요?',
        a: '현재 계좌이체(무통장입금)로만 결제가 가능합니다. 주문 완료 후 안내되는 계좌로 주문 금액을 입금해주시면, 입금 확인 후 발송됩니다.',
      },
      {
        q: '입금 확인은 얼마나 걸리나요?',
        a: '운영자가 계좌의 실제 입금 내역을 직접 확인한 뒤 입금완료로 처리합니다. 입금 후 주문 상세에서 입금확인 요청을 눌러주시면 더 빨리 확인할 수 있습니다. 확인 시간은 고객센터 상담 시간을 참고해주세요.',
      },
      {
        q: '입금자명을 다르게 했는데 괜찮나요?',
        a: '주문자 이름과 입금자명이 다를 경우 확인이 지연될 수 있습니다. 고객센터(아래 연락처)로 연락 주시면 빠르게 처리해드립니다.',
      },
    ],
  },
  {
    category: '교환·환불',
    items: [
      {
        q: '교환 및 환불이 가능한가요?',
        a: '청약철회·교환·환불은 전자상거래법 등 관계 법령과 이용약관에 따릅니다. 신선식품이라는 이유만으로 법정 권리를 일률적으로 제한하지 않으며, 상품이 안내와 다르거나 이상이 있는 경우에도 법령상 권리가 보장됩니다. 주문번호와 상품 상태 사진을 준비해 고객센터로 문의해주세요.',
      },
      {
        q: '주문을 취소하고 싶어요.',
        a: '입금확인 요청 전에는 주문 상세 화면에서 직접 취소할 수 있습니다. 입금확인을 요청했거나 입금이 확인된 뒤에는 고객센터로 취소를 요청해주세요. 운영자가 확인한 뒤 취소하고, 입금하신 금액은 계좌로 돌려드립니다.',
      },
      {
        q: '귤 껍질이 울퉁불퉁하거나 흠집이 있어요.',
        a: '겉모양을 위한 약품 처리를 하지 않아 표면이 고르지 않거나 작은 흠이 있을 수 있습니다. 겉껍질의 흠은 대개 맛에 큰 영향을 주지 않지만, 무르거나 속까지 상한 귤이 있다면 사진과 함께 알려주세요.',
      },
      {
        q: '귤 품질이 불량인 경우 어떻게 하나요?',
        a: '불량 귤과 상자 상태를 사진으로 찍어 주문번호와 함께 고객센터(아래 연락처)로 보내주세요. 확인 후 관계 법령과 이용약관에 따라 교환 또는 환불해드립니다.',
      },
    ],
  },
]

export default async function FaqPage() {
  const settings = await getStoreSettingsForDisplay()
  return (
    <div className="page-enter">
      {/* 헤더 */}
      <PageHeader title="자주 묻는 질문" description="궁금한 점을 빠르게 확인해보세요" />

      {/* FAQ 목록 */}
      <div className="px-4 py-6 space-y-8">
        {FAQ_LIST.map((section) => (
          <div key={section.category}>
            <h2 className="text-base font-bold text-orange-500 mb-4 border-b border-orange-100 pb-2">
              {section.category}
            </h2>
            <div className="space-y-4">
              {section.items.map((item) => (
                <details
                  key={item.q}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 group"
                >
                  <summary className="px-5 py-4 cursor-pointer list-none flex justify-between items-center gap-3">
                    <span className="font-medium text-gray-800 text-sm">{item.q}</span>
                    <span className="text-orange-400 text-lg group-open:rotate-45 transition-transform flex-shrink-0">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 추가 문의 */}
      <section className="px-4 pb-8">
        <div className="bg-orange-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">찾는 답변이 없으신가요?</p>
          <p className="font-bold text-gray-800 mb-3">고객센터: {settings.contactPhone || '연락처 준비 중'}</p>
          {settings.contactHours && <p className="text-xs text-gray-500">{settings.contactHours}</p>}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 text-center">
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors"
        >
          지금 주문하기 →
        </Link>
      </section>
    </div>
  )
}
