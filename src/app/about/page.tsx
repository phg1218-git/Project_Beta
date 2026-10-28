import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '농장 소개',
  description:
    '제주 조천읍 입도 1세대 감귤 농가 오늘의귤 이야기. 농약은 필요한 만큼만 쓰고, 수확한 귤을 농장에서 직접 포장해 보내드립니다.',
  openGraph: {
    title: '농장 소개 | 오늘의귤',
    description: '제주 조천읍 입도 1세대의 고집 — 투박하지만 가장 건강한 귤.',
  },
}

export default function AboutPage() {
  return (
    <div className="page-enter">
      {/* 히어로 */}
      <section
        className="flex flex-col items-center justify-center text-center px-6 py-16"
        style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)' }}
      >
        <div className="text-6xl mb-4">🍊</div>
        <h1 className="text-2xl font-black text-white mb-3">
          제주 조천읍,<br />입도 1세대의 고집
        </h1>
        <p className="text-white/90 text-sm max-w-md">
          화려한 포장도, 매끄러운 겉면도 없습니다.<br />
          흙의 힘을 믿는 농부의 정직한 귤입니다.
        </p>
      </section>

      {/* 농장 스토리 */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-6 text-gray-900">우리 농장을 소개합니다</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
            <p>
              오늘의귤은 제주특별자치도 제주시 조천읍에 자리한 감귤 농장입니다.
              아버지 세대에 육지에서 제주도로 들어온 입도(入島) 1세대가 처음 일군 땅 위에서,
              지금도 그 고집 그대로 귤을 키우고 있습니다.
            </p>
            <p>
              인증서나 화려한 마케팅보다 농사 방식으로 말합니다. 병해충 방제를 위해 반드시 필요한
              최소한의 농약 외에는 뿌리지 않습니다. 덕분에 귤 표면이 울퉁불퉁하고 껍질에 흠집이
              남기도 합니다. 그래도 괜찮습니다. 농약을 줄인 자리를 흙의 힘과 제주의 햇볕이 채우기 때문입니다.
            </p>
            <p>
              중간 유통 단계 없이 농장에서 직접 포장해 소비자에게 보내드립니다. 꾸밈없이, 정직하게.
            </p>
          </div>
        </div>
      </section>

      {/* 숫자로 보는 오늘의귤 */}
      <section className="py-12 px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-8 text-center text-gray-900">숫자로 보는 오늘의귤</h2>
          <div className="grid grid-cols-2 gap-6 text-center">
            {[
              { num: '1세대', label: '입도 가족 농장' },
              { num: '최소', label: '농약 사용' },
              { num: '0단계', label: '중간 유통' },
              { num: '직접', label: '포장·발송' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-2xl font-black text-orange-500 mb-1">{item.num}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 재배 방식 */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-6 text-gray-900">재배 방식</h2>
          <div className="space-y-6">
            {[
              {
                emoji: '🌱',
                title: '농약은 필요한 만큼만',
                desc: '병해충으로부터 작물을 지키기 위해 반드시 필요한 최소한의 농약만 사용합니다. 겉모양을 위한 착색제나 방부 처리는 하지 않습니다. 겉모양보다 속의 건강함을 선택합니다.',
              },
              {
                emoji: '🌍',
                title: '흙을 살리는 농법',
                desc: '화학 비료 의존을 줄이고 유기물을 꾸준히 넣어 땅 자체의 힘을 키웁니다. 건강한 흙에서 자란 귤나무는 병에 강하고, 자연스럽게 농약이 덜 필요해집니다.',
              },
              {
                emoji: '🍊',
                title: '투박하지만 정직한 선별',
                desc: '크기와 외관이 아닌 맛과 건강함을 기준으로 수확합니다. 껍질이 고르지 않아도, 조금 작아도 맛이 좋은 귤을 보내드립니다. 흠이 있어 보여도 그게 진짜 귤의 모습입니다.',
              },
              {
                emoji: '📦',
                title: '산지 직송',
                desc: '수확한 귤을 농장에서 직접 포장해 택배로 보내드립니다. 발송 일정은 배송·고객 안내에서 확인할 수 있습니다.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 조천읍 이야기 */}
      <section className="py-12 px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-6 text-gray-900">조천읍, 이 땅이 특별한 이유</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
            <p>
              조천읍은 제주도 북동쪽에 위치한 지역으로, 한라산 중턱에서 내려오는 맑은 공기와
              동쪽 해안의 해양성 기후가 만나는 곳입니다. 낮과 밤의 일교차가 크고, 화산 현무암
              토양의 자연 배수성이 뛰어나 귤나무 뿌리가 건강하게 자라기 좋은 환경입니다.
            </p>
            <p>
              일교차가 클수록 낮에 만들어진 당분이 밤에 잘 농축됩니다. 조천읍 귤이 달고도 산미가
              살아있는 이유가 여기에 있습니다. 귤 맛은 해마다 날씨에 따라 달라지지만, 이 땅의 힘을 믿고 키웁니다.
            </p>
          </div>
        </div>
      </section>

      {/* 농약에 대한 솔직한 이야기 */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-6 text-gray-900">농약에 대한 솔직한 이야기</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
            <p>
              &quot;무농약&quot;이라는 말은 쓰지 않습니다. 사실이 아니기 때문입니다. 제주의 고온다습한 환경에서
              귤을 재배하다 보면 궤양병, 응애, 깍지벌레 같은 병해충이 반드시 찾아옵니다.
              이를 완전히 방치하면 귤나무 자체가 죽어버립니다.
            </p>
            <p>
              저희는 방제가 꼭 필요한 시기에만, 꼭 필요한 최소량의 농약을 씁니다.
              농약 안전사용기준을 지키고, 겉모양을 좋게 하기 위한 약품은 쓰지 않습니다.
              솔직하게 키우고, 솔직하게 전합니다.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 px-6 bg-white text-center">
        <p className="text-gray-500 text-sm mb-4">
          직접 맛보세요 — 농장에서 바로 보내드립니다
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors"
        >
          상품 보러가기 →
        </Link>
      </section>
    </div>
  )
}
