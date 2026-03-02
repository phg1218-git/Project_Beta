'use client'

// OrangeTopHeader
// - sticky + blur 배경
// - 로그인 상태에 따라 버튼 변경
// - role === 'ADMIN'일 때만 "관리자페이지" 버튼 노출
// - 실제 프로젝트: useSession() 훅으로 session.user.role 사용

export function OrangeTopHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}
    >
      {/* 로고 */}
      <a
        href="/products"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'Noto Serif KR', serif",
          fontSize: 20, fontWeight: 900,
          color: 'var(--primary)',
          letterSpacing: '-0.5px',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 22 }}>🍊</span>
        오늘의귤
      </a>

      {/* 우측 액션 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 장바구니 */}
        <a
          href="/cart"
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', position: 'relative',
            fontSize: 20, textDecoration: 'none',
          }}
          aria-label="장바구니"
        >
          🛒
          <span
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 16, height: 16,
              background: 'var(--secondary)',
              borderRadius: '50%',
              fontSize: 10, fontWeight: 700, color: '#1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            2
          </span>
        </a>

        {/* ─ 관리자 버튼: role === 'ADMIN' 인 경우에만 노출 ─
            실제 프로젝트에서는 아래처럼 사용:
            const { data: session } = useSession()
            if (session?.user?.role === 'ADMIN') show this button
        */}
        {/* <AdminButton /> */}

        {/* 로그인 버튼 */}
        <a
          href="/login"
          style={{
            padding: '6px 14px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 20,
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}
        >
          로그인
        </a>
      </div>
    </header>
  )
}
