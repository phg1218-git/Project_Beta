// /admin 페이지 — role: ADMIN만 접근 가능
// 실제 미들웨어(middleware.ts)에서 접근 제어 처리

export default function AdminPage() {
  const menus = [
    { icon: '📋', label: '주문 조회',  path: '/admin/orders',   desc: '입금확인 처리 · 배송 관리' },
    { icon: '📊', label: '수익 통계',  path: '/admin/revenue',  desc: '일/주/월별 매출 집계' },
    { icon: '🍊', label: '상품 관리',  path: '/admin/products', desc: '상품 등록 · 수정 · 삭제' },
    { icon: '👥', label: '회원 조회',  path: '/admin/members',  desc: '회원 정보 조회' },
  ]

  return (
    <div className="page-enter">
      <div
        style={{
          padding: '20px 16px 12px',
          background: '#1A1A1A',
          borderBottom: 'none',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFC94A' }}>⚙ 관리자 페이지</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
          주문 · 상품 · 통계를 관리합니다
        </p>
      </div>

      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 16,
          }}
        >
          {menus.map((menu) => (
            <a
              key={menu.path}
              href={menu.path}
              style={{
                background: 'white', borderRadius: 16, padding: 20,
                boxShadow: 'var(--shadow-card)', textAlign: 'center',
                cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                display: 'block',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{menu.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{menu.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {menu.desc}
              </div>
            </a>
          ))}
        </div>

        <a
          href="/products"
          style={{
            display: 'block', width: '100%', padding: 14,
            background: 'var(--neutral-100)', border: 'none',
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            color: 'var(--text-secondary)', cursor: 'pointer',
            textDecoration: 'none', textAlign: 'center',
          }}
        >
          ← 일반 페이지로 돌아가기
        </a>
      </div>
    </div>
  )
}
