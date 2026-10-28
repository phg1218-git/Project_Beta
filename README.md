# 🍊 오늘의귤 — Project_Beta

> 제주 산지 직송 귤 판매 서비스 | 감성 · 트렌디 · 농장 직송

---

## 📋 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router), React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| ORM | Prisma 5 (`prisma/migrations`) |
| Database | PostgreSQL (Neon) |
| Runtime | Node 22 (`.nvmrc`), Netlify 배포 |
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

> ⚠️ `.env.local`의 DB가 운영 DB와 같을 수 있습니다. 운영 DB에는 `db push`·`migrate dev`·`migrate reset`을 실행하지 마세요.
> 절차는 [docs/DATABASE.md](docs/DATABASE.md)를 따릅니다 (운영: `prisma migrate deploy`, 테스트 DB 분리).

### 테스트

```bash
npm test                 # 단위 테스트 (DB 연결 없음)
npm run typecheck
npm run test:integration # TEST_DATABASE_URL로 분리된 DB에서만 실행
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
│   ├── page.tsx            # 메인 (관리자 메인 소개 설정 반영)
│   ├── products/           # 상품 목록 (탭 1)
│   ├── cart/               # 장바구니 (탭 2)
│   ├── orders/             # 주문 조회 (탭 3)
│   ├── profile/            # 내 정보·배송지·회원 탈퇴 (탭 4)
│   ├── about/ faq/ support/ policies/ privacy/  # 안내·정책 (관리자 설정 반영)
│   ├── admin/              # 관리자: 주문(입금확인·배송·취소·환불), 상품, 회원(탈퇴 처리), 설정, 로그
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
  │            │                    │               │           │
  └ 고객 취소   └──── 관리자 취소(사유 기록) ──────────┴───────────┘ → CANCELED
```

- 결제는 무통장입금만 사용하며, 관리자가 실제 계좌 입금을 확인해 입금완료 처리합니다 (PG·SMS 인증 없음).
- 입금 후 취소된 주문은 '환불 필요'로 표시되고, 관리자가 계좌에서 직접 송금한 뒤 환불 금액을 기록합니다 (자동 송금 없음).
- 발송 전 취소는 재고를 되돌리고, 발송 후 취소는 상품 상태를 보고 재고 복구 여부를 선택합니다.

---

## ⚙ 관리자 계정

- `role: ADMIN` 계정만 `/admin/*` 접근 가능
- 헤더에 "관리자페이지" 버튼 노출 (일반 USER는 미노출)
- `ADMIN_EMAILS`에 있는 계정은 로그인 시 관리자로 승격되며, 권한은 요청마다 DB 기준으로 다시 확인합니다.

---

## 🔑 카카오 / 네이버 OAuth 설정 체크리스트

> 로그인이 안 될 때 **코드 문제**와 **콘솔 설정 문제**를 구분하기 위한 체크리스트입니다.

### 공통 — URL / Redirect URI

| 항목 | 로컬 개발 | 운영(Netlify 등) |
|------|-----------|-----------------|
| `AUTH_URL` (또는 `NEXTAUTH_URL`) | `http://localhost:3000` | `https://your-domain.com` |
| Kakao Redirect URI | `http://localhost:3000/api/auth/callback/kakao` | `https://your-domain.com/api/auth/callback/kakao` |
| Naver Callback URL | `http://localhost:3000/api/auth/callback/naver` | `https://your-domain.com/api/auth/callback/naver` |

> **주의**: Auth.js v5는 `AUTH_URL`을 우선 참조합니다. `NEXTAUTH_URL`도 폴백으로 인식되지만, 배포 환경에서는 두 값 모두 올바른 도메인으로 설정하세요.

---

### 카카오 — developers.kakao.com

- [ ] **앱 생성** 후 `REST API 키`를 `AUTH_KAKAO_ID`에 설정
- [ ] `CLIENT_SECRET` 활성화 및 값을 `AUTH_KAKAO_SECRET`에 설정
  (카카오디벨로퍼스 → 내 애플리케이션 → 보안 → Client Secret)
- [ ] **플랫폼 → Web**: 서비스 도메인 등록
  (로컬: `http://localhost:3000` / 운영: `https://your-domain.com`)
- [ ] **카카오 로그인 → Redirect URI** 등록
  - `http://localhost:3000/api/auth/callback/kakao`
  - `https://your-domain.com/api/auth/callback/kakao`
- [ ] **카카오 로그인 활성화** ON
- [ ] **동의항목** 확인:
  - `account_email` — **필수 동의** 또는 **선택 동의** 로 설정
    (없으면 `NoEmail` 에러로 로그인 실패)
  - `profile_nickname`, `profile_image` — 선택 동의 권장
- [ ] **비즈 앱 전환 전**: 팀원 계정은 테스터로 등록해야 로그인 가능
  (카카오디벨로퍼스 → 팀 관리 → 팀원 추가)
- [ ] **운영 서비스 전환 시**: 카카오 검수 신청 완료 여부 확인

#### 증상으로 원인 구분

| 화면에 보이는 증상 | 가능한 원인 |
|-------------------|------------|
| `NoEmail` 에러 메시지 | 동의항목에 이메일 미포함 또는 사용자가 동의 거부 |
| `OAuthCallback` / `OAuthSignin` 에러 | Redirect URI 불일치 또는 Client Secret 오류 |
| 카카오 로그인 버튼 클릭 후 바로 에러 | `AUTH_KAKAO_ID` 누락 또는 잘못된 값 |
| "앱이 서비스 준비 중" 메시지 | 비즈 앱 미전환 + 테스터 미등록 |

---

### 네이버 — developers.naver.com

- [ ] **애플리케이션 등록** 후 `Client ID`를 `AUTH_NAVER_ID`에 설정
- [ ] `Client Secret`을 `AUTH_NAVER_SECRET`에 설정
- [ ] **API 설정 → 네아로(네이버 아이디로 로그인)** 선택
- [ ] **Callback URL** 등록
  - `http://localhost:3000/api/auth/callback/naver`
  - `https://your-domain.com/api/auth/callback/naver`
- [ ] **제공 정보** 확인:
  - `이메일` — **필수** (없으면 `NoEmail` 에러)
  - `이름`, `프로필 사진` — 선택
- [ ] **서비스 환경**: PC 웹 / 모바일 웹 등록 여부 확인

#### 증상으로 원인 구분

| 화면에 보이는 증상 | 가능한 원인 |
|-------------------|------------|
| `NoEmail` 에러 메시지 | 제공 정보에 이메일 미포함 |
| `OAuthCallback` 에러 | Callback URL 불일치 |
| 네이버 로그인 후 흰 화면 | `AUTH_URL` / `NEXTAUTH_URL`이 `localhost`로 고정된 채 운영 배포 |

---

### 로컬 ↔ 운영 환경 분리 방법

```bash
# 로컬: .env.local (git 제외)
AUTH_URL=http://localhost:3000

# 운영: Netlify / Vercel 환경변수 패널에서 직접 설정
AUTH_URL=https://your-domain.com
```

- `.env.local`은 `.gitignore`에 포함되어야 합니다.
- 운영 키와 로컬 키를 분리하려면 카카오/네이버 콘솔에서 **별도 앱**을 생성하는 것을 권장합니다.

---

운영 인수인계와 남은 작업은 [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md)를 참고하세요.
