import { getHomeContent } from '@/lib/site-content'
import Link from 'next/link'
import { auth } from '@/auth'
import { contactText, getStoreSettingsForDisplay } from '@/lib/store-settings'

// 메인 랜딩 페이지 - 만생귤 소개와 보관 안내
export default async function HomePage() {
  const session = await auth()
  const content = await getHomeContent()
  const settings = await getStoreSettingsForDisplay()
  const bankAccount = settings.bankAccount || process.env.BANK_ACCOUNT_INFO

  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-16"
        style={{
          background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)',
          minHeight: '52vh',
        }}
      >
        <div className="float-emoji text-7xl mb-6">🍊</div>
        <h1
          className="text-3xl font-black text-white mb-4 break-keep"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
        >
          <span className="whitespace-pre-line">{content.title}</span>
        </h1>
        <p className="text-white/90 text-base mb-8 max-w-md break-keep">
          <span className="whitespace-pre-line">{content.introduction}</span>
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-500 font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
        >
          지금 주문하기 →
        </Link>
      </section>

      {/* 만생귤 소개 */}
      <section className="py-10 px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-4">
            {content.storyTitle}
          </h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            <span className="whitespace-pre-line">{content.story}</span>
          </p>
        </div>
      </section>

      {/* 귤 보관 & 관리법 */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-2 text-center text-gray-900">
            귤, 이렇게 보관하세요
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            산지 직송 귤의 신선함을 오래 유지하는 방법
          </p>
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                emoji: '🌡️',
                title: '서늘한 곳 상온 보관',
                desc: '귤은 냉장 보관보다 서늘하고 통풍이 잘 되는 상온(10~15°C)이 적합합니다. 베란다나 현관 근처가 좋습니다. 보관 기간은 귤 상태와 온도·습도에 따라 달라집니다.',
              },
              {
                emoji: '❄️',
                title: '냉장 보관 시 신문지로 감싸기',
                desc: '냉장 보관이 필요하다면 귤 하나하나를 신문지나 키친타월로 감싼 뒤 채소칸에 넣어주세요. 수분 손실과 냉해를 줄여 더 오래 두고 드실 수 있습니다.',
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

      {/* CTA Section */}
      <section className="py-10 px-6 bg-white text-center">
        <p className="text-gray-500 text-sm mb-4">
          {session ? `${session.user?.name || '회원'}님, 환영합니다! 🍊` : settings.shippingFee === 0 ? '현재 배송비 무료' : `배송비 ${settings.shippingFee.toLocaleString()}원`}
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
          <Link href="/support" className="hover:text-orange-400 transition-colors">배송·고객 안내</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-orange-400 transition-colors">개인정보처리방침</Link>
        </nav>
        <p className="mb-2">{settings.farmName}{settings.region && ` | ${settings.region}`}</p>
        <p className="mb-2">고객센터: {contactText(settings)}</p>
        {bankAccount && <p>입금 계좌: {bankAccount}</p>}
        <p className="mt-4 text-gray-600">© 2025 오늘의귤. All rights reserved.</p>
      </footer>
    </div>
  )
}
