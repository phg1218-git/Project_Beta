// src/auth.ts
// Auth.js v5 (NextAuth beta) 설정
// JWT 세션 전략 사용 (Edge Runtime 호환)

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Naver from 'next-auth/providers/naver'

// 관리자 이메일 목록 - 해당 이메일은 자동으로 ADMIN 권한 부여
const ADMIN_EMAILS = ['dnffkffk486@gmail.com']

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID!,
      clientSecret: process.env.AUTH_NAVER_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.role = ADMIN_EMAILS.includes(user.email || '') ? 'ADMIN' : 'USER'
        token.profileComplete = true
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as 'USER' | 'ADMIN'
        session.user.profileComplete = token.profileComplete as boolean
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'USER' | 'ADMIN'
      profileComplete: boolean
    }
  }
}
