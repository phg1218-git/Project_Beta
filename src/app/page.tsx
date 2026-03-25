import Link from 'next/link'
import { auth } from '@/auth'

const BANK_ACCOUNT_INFO = process.env.BANK_ACCOUNT_INFO || '농협 000-0000-0000-00 (오늘의귤)'

// 메인 랜딩 페이지 - Hero Section + 브랜드 스토리 + 신뢰 요소
export default async function HomePage() {
  const session = await auth()

  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-16"
        style={{
          background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)',
          minHeight: '60vh',
        }}
      >
        <div className="float-emoji text-7xl mb-6">🍊</div>
        <h1
          className="text-3xl md:text-4xl font-black text-white mb-4"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
        >
          제주 조천읍,<br />입도 1세대의 고집으로 키운<br />정직한 귤
        </h1>
        <p className="text-white/90 text-base md:text-lg mb-8 max-w-md">
          화려한 포장과 매끄러운 겉면은 없습니다.<br />
          농약을 줄이고 흙의 힘을 믿는 아버지의 고집스러운 농법은<br />
          비록 투박한 껍질을 남겼지만, 그 속에 가장 건강한 생명력을 채웠습니다.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-500 font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
        >
          지금 주문하기 →
        </Link>
      </section>

      {/* 신뢰 요소 */}
      <section className="py-10 px-6 bg-white">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
          <TrustItem emoji="🍊" title="당도 보장" desc="엄선된 고당도 귤만" />
          <TrustItem emoji="🚚" title="익일 배송" desc="오늘 수확, 내일 도착" />
          <TrustItem emoji="🌱" title="저농약 재배" desc="필수 농약 외 무사용" />
        </div>
      </section>

      {/* 브랜드 스토리 */}
      <section className="py-12 px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            제주 조천읍, 우리 농장 이야기
          </h2>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base">
            조천읍 농장에서 바로 전하는, 꾸밈없는 제주의 맛입니다.
            <br />
            필수 농약 외에는 뿌리지 않는 아버지의 고집,
            <br />
            그 투박함 속에 가장 건강한 귤이 자랍니다.
          </p>
        </div>
      </section>

      {/* 귤 보관 & 관리법 */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-center text-gray-900">
            귤, 이렇게 보관하세요
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            산지 직송 귤의 신선함을 오래 유지하는 방법
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                emoji: '🌡️',
                title: '서늘한 곳 상온 보관',
                desc: '귤은 냉장 보관보다 서늘하고 통풍이 잘 되는 상온(10~15°C)이 적합합니다. 베란다나 현관 근처가 이상적입니다. 상온에서 약 2~3주 신선하게 드실 수 있습니다.',
              },
              {
                emoji: '❄️',
                title: '냉장 보관 시 신문지로 감싸기',
                desc: '냉장 보관이 필요하다면 귤 하나하나를 신문지나 키친타월로 감싼 뒤 채소칸에 넣어주세요. 수분 손실과 냉해를 막아 4~6주까지 유지됩니다.',
              },
              {
                emoji: '📦',
                title: '박스째 눕히지 마세요',
                desc: '귤을 박스에 담아 보관할 때는 뚜껑을 열어 통풍시키고, 아래 귤이 눌리지 않게 2~3단 이상 쌓지 않는 것이 좋습니다. 습기가 차면 곰팡이가 생길 수 있습니다.',
              },
              {
                emoji: '🍽️',
                title: '먹기 30분 전 꺼내기',
                desc: '냉장 보관 중인 귤은 먹기 30분 전에 꺼내 상온에 두면 당도와 향이 더 살아납니다. 차가운 상태로 드시면 단맛이 덜 느껴질 수 있습니다.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-orange-50/40">
                <div className="text-2xl flex-shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 제주 귤의 제철 */}
      <section className="py-12 px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-center text-gray-900">
            제주 귤의 제철과 종류
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            시기마다 다른 제주 감귤의 맛
          </p>
          <div className="space-y-4">
            {[
              {
                period: '9월 ~ 10월',
                name: '극조생 온주밀감',
                desc: '가장 먼저 나오는 귤로 껍질이 얇고 과즙이 풍부합니다. 새콤달콤한 맛이 강하며 제철의 시작을 알립니다.',
                color: 'bg-yellow-100 text-yellow-700',
              },
              {
                period: '11월 ~ 12월',
                name: '조생 온주밀감',
                desc: '감귤 하면 떠오르는 바로 그 맛. 당도와 산미의 균형이 가장 좋은 시기입니다. 오늘의귤이 가장 자신 있는 시즌입니다.',
                color: 'bg-orange-100 text-orange-700',
              },
              {
                period: '1월 ~ 2월',
                name: '만감류 (한라봉·천혜향)',
                desc: '겨울철 대표 프리미엄 감귤. 과육이 크고 향이 진하며 당도가 높습니다. 선물용으로 특히 인기가 좋습니다.',
                color: 'bg-amber-100 text-amber-700',
              },
            ].map((item) => (
              <div key={item.name} className="flex gap-4 items-start bg-white rounded-2xl p-4 shadow-sm">
                <div className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${item.color}`}>
                  {item.period}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 px-6 bg-white text-center">
        <p className="text-gray-500 text-sm mb-4">
          {session ? `${session.user?.name || '회원'}님, 환영합니다! 🍊` : '첫 주문 시 무료배송 혜택!'}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors"
        >
          상품 둘러보기
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-xs leading-relaxed">
        <nav className="flex justify-center gap-4 mb-4 text-gray-500">
          <Link href="/about" className="hover:text-orange-400 transition-colors">농장 소개</Link>
          <span>·</span>
          <Link href="/faq" className="hover:text-orange-400 transition-colors">자주 묻는 질문</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-orange-400 transition-colors">개인정보처리방침</Link>
        </nav>
        <p className="mb-2">오늘의귤 | 제주특별자치도 제주시 조천읍</p>
        <p className="mb-2">고객센터: 010-0000-0000 (평일 09:00~18:00)</p>
        <p>입금 계좌: {BANK_ACCOUNT_INFO}</p>
        <p className="mt-4 text-gray-600">© 2025 오늘의귤. All rights reserved.</p>
      </footer>
    </div>
  )
}

function TrustItem({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl mb-2">{emoji}</span>
      <span className="font-bold text-sm text-gray-800">{title}</span>
      <span className="text-xs text-gray-500 mt-1">{desc}</span>
    </div>
  )
}
