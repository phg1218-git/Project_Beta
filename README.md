# 🍊 오늘의귤 — Project_Beta

> 제주 산지 직송 귤 판매 서비스 | 감성 · 트렌디 · 농장 직송

---

## 📋 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Auth.js v5 (Google / Naver / Kakao) |

---

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 파일을 열고 각 값 입력
```

### 3. DB 마이그레이션

```bash
npm run db:push      # 개발용 빠른 적용
# 또는
npm run db:migrate   # 마이그레이션 파일 생성
```

### 4. 개발 서버 실행

```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃 (헤더 + 하단 탭바)
│   ├── page.tsx            # / → /products 리다이렉트
│   ├── products/           # 상품 목록 (탭 1)
│   ├── cart/               # 장바구니 (탭 2)
│   ├── orders/             # 주문 조회 (탭 3)
│   ├── profile/            # 프로필수정 (탭 4)
│   ├── admin/              # 관리자 페이지 (role: ADMIN)
│   └── login/              # 소셜 로그인
├── components/
│   ├── OrangeTopHeader.tsx    # 상단 헤더 (sticky + blur)
│   ├── CitrusBottomTabBar.tsx # 하단 탭바 (fixed, 4개 탭)
│   ├── ProductCard.tsx        # 상품 카드
│   └── OrderStatusBadge.tsx   # 주문 상태 뱃지
├── lib/
│   ├── prisma.ts           # Prisma 클라이언트
│   └── utils.ts            # 유틸 함수
├── types/
│   └── index.ts            # 공통 타입 / 상수
├── auth.ts                 # Auth.js 설정
└── middleware.ts           # 접근 제어 미들웨어
prisma/
└── schema.prisma           # DB 스키마
```

---

## 🎨 디자인 시스템

| 토큰 | HEX | 용도 |
|------|-----|------|
| Primary | `#FF8A00` | CTA 버튼, 주요 강조 |
| Secondary | `#FFC94A` | 배지, 포인트 컬러 |
| Accent | `#6BAF5E` | 신선도/자연 강조 |
| Background | `#FFF8EE` | 기본 배경 |

---

## 📱 하단 탭바 구조

| 탭 | 경로 | 설명 |
|----|------|------|
| 🍊 상품조회 | `/products` | 상품 목록 |
| 🛒 장바구니 | `/cart` | 장바구니 |
| 📦 주문조회 | `/orders` | 주문 내역 |
| 👤 프로필수정 | `/profile` | 내 정보 |

> 모바일/데스크탑 모두에서 하단 고정 표시  
> `position: fixed; z-index: 200; padding-bottom: env(safe-area-inset-bottom)`

---

## 🔐 주문 상태 흐름

```
DRAFT → DEPOSIT_REQUESTED → PAYMENT_CONFIRMED → SHIPPING → DELIVERED
                                                          ↘ CANCELED
```

---

## ⚙ 관리자 계정

- `role: ADMIN` 계정만 `/admin/*` 접근 가능
- 헤더에 "관리자페이지" 버튼 노출 (일반 USER는 미노출)
- Prisma Studio에서 직접 role 변경: `npm run db:studio`

---

**🍊 화이팅! 오늘의귤 파이팅입니다.**
