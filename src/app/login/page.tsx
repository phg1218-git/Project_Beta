'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Auth.js v5 에러 코드 → 한국어 메시지
// NoEmail / ServerError 는 auth.ts signIn 콜백에서 직접 리다이렉트하는 커스텀 코드
const ERROR_MESSAGES: Record<string, string> = {
  NoEmail:
    '이 소셜 계정에서 이메일을 가져올 수 없습니다. 해당 플랫폼 앱 설정에서 이메일 제공 동의 여부를 확인해 주세요.',
  AccessDenied:
    '로그인이 거부되었습니다. 이메일 동의항목을 확인하거나 잠시 후 다시 시도해 주세요.',
  OAuthAccountNotLinked:
    '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 방식을 이용해 주세요.',
  OAuthSignin: 'OAuth 로그인 시작에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  OAuthCallback:
    'OAuth 인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  OAuthCreateAccount: '계정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  Callback: '인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  ServerError: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  Configuration: '서비스 설정 오류입니다. 관리자에게 문의해 주세요.',
}

// useSearchParams는 Suspense 경계 안에서만 사용 가능 (Next.js 15 요건)
function ErrorBanner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  if (!error) return null

  const message =
    ERROR_MESSAGES[error] ?? '로그인 중 오류가 발생했습니다. 다시 시도해 주세요.'

  return (
    <div
      role="alert"
      className="w-full max-w-sm mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center"
    >
      {message}
    </div>
  )
}

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/products')
    }
  }, [status, router])

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' })
  }

  const handleNaverLogin = () => {
    signIn('naver', { callbackUrl: '/' })
  }

  const handleKakaoLogin = () => {
    signIn('kakao', { callbackUrl: '/' })
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-4xl animate-bounce">🍊</div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-8">
      {/* 로고 */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🍊</div>
        <h1
          className="text-3xl font-black text-orange-500 mb-2"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
        >
          오늘의귤
        </h1>
        <p className="text-gray-500 text-sm">제주에서 온 달콤한 선물</p>
      </div>

      {/* Auth.js 에러 메시지 (?error= 쿼리 파라미터) */}
      <Suspense>
        <ErrorBanner />
      </Suspense>

      {/* 소셜 로그인 버튼 */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-3 w-full h-13 px-4 py-3 bg-white text-gray-900 font-semibold rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow min-h-[52px]"
        >
          <GoogleIcon />
          Google로 시작하기
        </button>

        <button
          onClick={handleNaverLogin}
          className="flex items-center justify-center gap-3 w-full h-13 px-4 py-3 bg-[#03C75A] text-white font-semibold rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[52px]"
        >
          <NaverIcon />
          네이버로 시작하기
        </button>

        <button
          onClick={handleKakaoLogin}
          className="flex items-center justify-center gap-3 w-full h-13 px-4 py-3 bg-[#FEE500] text-gray-900 font-semibold rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[52px]"
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
        최초 로그인 시 기본 정보를 입력합니다
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

// 네이버 공식 N 심볼 (흰색, 버튼 배경 #03C75A 위에 표시)
function NaverIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FFFFFF"
        d="M13.5 12.6 10.2 7.5H7.5v9h3V11.4L13.8 16.5H16.5v-9h-3v5.1z"
      />
    </svg>
  )
}

// 카카오톡 로고: 다크 브라운 말풍선 + 내부 노란 TALK 텍스트
// 버튼 배경 #FEE500(노란색)이 말풍선 외곽 배경 역할을 함
function KakaoIcon() {
  return (
    <svg width="40" height="35" viewBox="0 0 40 35" aria-hidden="true">
      {/* 말풍선 몸통 (둥근 사각형) */}
      <rect x="1" y="1" width="38" height="25" rx="11" fill="#3C1E1E" />
      {/* 말풍선 꼬리 (좌하단 삼각형) */}
      <polygon points="7,23 17,23 10,34" fill="#3C1E1E" />
      {/* TALK 텍스트 (노란색, 굵게) */}
      <text
        x="20"
        y="18.5"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="10.5"
        fontWeight="900"
        fill="#FEE500"
        textAnchor="middle"
        letterSpacing="1.5"
      >
        TALK
      </text>
    </svg>
  )
}
