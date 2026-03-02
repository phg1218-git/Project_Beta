// src/auth.ts
// Auth.js v5 (NextAuth beta) 설정
// 실제 사용 시 .env.local에 OAuth 키 입력 필요

import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // Naver / Kakao는 Custom Provider로 추가
    // 참고: https://authjs.dev/guides/providers/custom-provider
  ],
  callbacks: {
    async session({ session, user }) {
      // session에 role, profileComplete 추가
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, profileComplete: true },
      })
      if (dbUser) {
        session.user.role = dbUser.role
        session.user.profileComplete = dbUser.profileComplete
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

// next-auth 타입 확장
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
