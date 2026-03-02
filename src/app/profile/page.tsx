export default function ProfilePage() {
  return (
    <div className="page-enter">
      {/* 프로필 헤더 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)',
          padding: '32px 20px 24px',
          color: 'white',
        }}
      >
        <div
          style={{
            width: 68, height: 68, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 12,
          }}
        >
          👤
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>귤좋아하는분</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>juler@kakao.com</div>
      </div>

      {/* 메뉴 */}
      <MenuSection title="내 정보">
        <MenuItem icon="👤" label="회원정보 수정" />
        <MenuItem icon="📍" label="배송지 관리" />
      </MenuSection>

      <MenuSection title="서비스">
        <MenuItem icon="📦" label="주문 내역" href="/orders" />
        <MenuItem icon="💬" label="고객센터" />
        <MenuItem icon="📄" label="이용약관" />
        <MenuItem icon="🚪" label="로그아웃" danger />
      </MenuSection>
    </div>
  )
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
          letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: 'white', borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)', overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function MenuItem({
  icon, label, href, danger,
}: {
  icon: string; label: string; href?: string; danger?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', padding: 16,
        borderBottom: '1px solid var(--neutral-100)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 20, marginRight: 12 }}>{icon}</span>
      <span
        style={{
          fontSize: 14, fontWeight: 600, flex: 1,
          color: danger ? 'var(--error)' : 'var(--text-primary)',
        }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--neutral-200)', fontSize: 18 }}>›</span>
    </div>
  )
}
