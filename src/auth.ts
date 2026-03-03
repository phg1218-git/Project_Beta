import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Naver from 'next-auth/providers/naver'
import { prisma } from '@/lib/prisma'

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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // 새로운 로그인 또는 토큰 생성 시 DB에서 실제 프로필 정보 조회
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            phone: true,
            addressBase: true,
            addressDetail: true,
            profileComplete: true,
            role: true,
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.email = dbUser.email
          token.name = dbUser.name
          token.image = dbUser.image
          token.phone = dbUser.phone
          token.addressBase = dbUser.addressBase
          token.addressDetail = dbUser.addressDetail
          token.profileComplete = dbUser.profileComplete
          token.role = ADMIN_EMAILS.includes(dbUser.email || '') ? 'ADMIN' : 'USER'
        }
      }

      // update() 호출 시 전달된 데이터로 갱신
      if (trigger === 'update') {
        if (session?.profileComplete !== undefined) {
          token.profileComplete = session.profileComplete
        }
        if (session?.phone !== undefined) {
          token.phone = session.phone
        }
        if (session?.addressBase !== undefined) {
          token.addressBase = session.addressBase
        }
        if (session?.addressDetail !== undefined) {
          token.addressDetail = session.addressDetail
        }
      }

      return token
    },
    async session({ session, token }) {
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
      phone?: string | null
      addressBase?: string | null
      addressDetail?: string | null
      role: 'USER' | 'ADMIN'
      profileComplete: boolean
    }
  }
}