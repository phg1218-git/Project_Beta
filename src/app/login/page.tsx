export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}
    >
      {/* 로고 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🍊</div>
        <h1
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 28, fontWeight: 900,
            color: 'var(--primary)', marginBottom: 8,
          }}
        >
          오늘의귤
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          제주에서 온 달콤한 선물
        </p>
      </div>

      {/* 소셜 로그인 버튼 */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SocialBtn
          href="/api/auth/signin/google"
          label="Google로 시작하기"
          bg="#fff"
          color="#1A1A1A"
          border="1.5px solid #E0E0E0"
          icon="🔵"
        />
        <SocialBtn
          href="/api/auth/signin/naver"
          label="네이버로 시작하기"
          bg="#03C75A"
          color="#fff"
          icon="N"
        />
        <SocialBtn
          href="/api/auth/signin/kakao"
          label="카카오로 시작하기"
          bg="#FEE500"
          color="#1A1A1A"
          icon="💬"
        />
      </div>

      <p
        style={{
          marginTop: 24, fontSize: 12,
          color: 'var(--text-secondary)', textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        최초 로그인 시 기본 정보를 입력합니다
      </p>
    </div>
  )
}

function SocialBtn({
  href, label, bg, color, border, icon,
}: {
  href: string; label: string; bg: string; color: string; border?: string; icon: string
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        height: 52, borderRadius: 14,
        background: bg, color, border: border ?? 'none',
        fontSize: 15, fontWeight: 700,
        textDecoration: 'none', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'opacity 0.2s',
        minHeight: 44, // 접근성: 터치 타겟 44px 이상
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </a>
  )
}
