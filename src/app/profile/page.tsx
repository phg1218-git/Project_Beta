'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍊</div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-gray-500 mb-4">로그인이 필요합니다</p>
          <Link
            href="/login"
            className="px-6 py-2 bg-orange-500 text-white font-medium rounded-full"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter pb-24">
      {/* 프로필 헤더 */}
      <div
        className="px-5 pt-8 pb-6 text-white"
        style={{
          background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)',
        }}
      >
        <div className="w-17 h-17 rounded-full bg-white/25 flex items-center justify-center mb-3">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt="프로필"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-3xl">👤</span>
          )}
        </div>
        <div className="text-xl font-bold mb-1">{session.user.name || '회원'}</div>
        <div className="text-sm opacity-85">{session.user.email}</div>
        {session.user.role === 'ADMIN' && (
          <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
            관리자
          </span>
        )}
      </div>

      {/* 메뉴 */}
      <MenuSection title="내 정보">
        <MenuItem icon="👤" label="회원정보 수정" href="/profile/edit" />
        <MenuItem icon="📍" label="배송지 관리" href="/profile/address" />
      </MenuSection>

      <MenuSection title="쇼핑">
        <MenuItem icon="📦" label="주문 내역" href="/orders" />
        <MenuItem icon="🛒" label="장바구니" href="/cart" />
      </MenuSection>

      {session.user.role === 'ADMIN' && (
        <MenuSection title="관리자">
          <MenuItem icon="⚙️" label="관리자 페이지" href="/admin" />
        </MenuSection>
      )}

      <MenuSection title="서비스">
        <MenuItem icon="💬" label="고객센터" />
        <MenuItem icon="📄" label="이용약관" />
        <MenuItem icon="🔐" label="개인정보처리방침" />
      </MenuSection>

      {/* 로그아웃 버튼 */}
      <div className="px-4 mt-4">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full py-3 bg-gray-100 text-red-500 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          로그아웃
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        오늘의귤 v1.0.0
      </p>
    </div>
  )
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 mt-4">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function MenuItem({
  icon,
  label,
  href,
  danger,
}: {
  icon: string
  label: string
  href?: string
  danger?: boolean
}) {
  const content = (
    <div className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
      <span className="text-xl mr-3">{icon}</span>
      <span
        className={`text-sm font-semibold flex-1 ${
          danger ? 'text-red-500' : 'text-gray-900'
        }`}
      >
        {label}
      </span>
      <span className="text-gray-300 text-lg">›</span>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
