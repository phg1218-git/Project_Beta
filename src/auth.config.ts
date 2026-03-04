import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Naver from 'next-auth/providers/naver'
import Kakao from 'next-auth/providers/kakao'

// Edge Runtime 호환 설정 (Prisma 없음) - 미들웨어에서 사용
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID ?? '',
      clientSecret: process.env.AUTH_NAVER_SECRET ?? '',
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID ?? '',
      clientSecret: process.env.AUTH_KAKAO_SECRET ?? '',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as 'USER' | 'ADMIN'
        session.user.profileComplete = token.profileComplete as boolean
        session.user.phone = token.phone as string | null | undefined
        session.user.addressBase = token.addressBase as string | null | undefined
        session.user.addressDetail = token.addressDetail as string | null | undefined
      }
      return session
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return baseUrl
    },
  },
}
