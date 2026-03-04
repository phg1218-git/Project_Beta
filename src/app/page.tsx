import Link from 'next/link'
import { auth } from '@/auth'

// 메인 랜딩 페이지 - Hero Section + 브랜드 스토리 + 신뢰 요소
export default async function HomePage() {
  const session = await auth().catch(() => null)

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
          오늘도 싱싱하게,<br />오늘의귤
        </h1>
        <p className="text-white/90 text-base md:text-lg mb-8 max-w-md">
          제주 산지에서 오늘 수확한 귤을<br />내일 문 앞에서 만나보세요
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
          <TrustItem emoji="🌿" title="친환경 재배" desc="농약 최소화 재배" />
        </div>
      </section>

      {/* 브랜드 스토리 */}
      <section className="py-12 px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            조천의 바람과 아버님의 손길로 빚은 달콤함
          </h2>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base">
            화려한 수식어 대신, 나무 한 그루 한 그루 직접 살피며 정성을 다했습니다.
            <br />
            자연을 닮은 귤을 위해 농약은 최소화하고, 제주의 햇살을 가득 담았습니다.
            <br />
            농장에서 문 앞까지, 아버님의 진심이 담긴 오늘의 귤을 직송해 드립니다.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 px-6 bg-white text-center">
        <p className="text-gray-500 text-sm mb-4">
          {session ? `${session.user.name || '회원'}님, 환영합니다! 🍊` : '첫 주문 시 무료배송 혜택!'}
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
        <p className="mb-2">오늘의귤 | 제주특별자치도 제주시 조천읍</p>
        <p className="mb-2">고객센터: 010-9599-0703 (평일 09:00~18:00)</p>
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
