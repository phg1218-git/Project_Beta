import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Naver from 'next-auth/providers/naver'
import Kakao from 'next-auth/providers/kakao'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS: string[] = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
  : []

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
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID!,
      // KOE004 대응:
      // Kakao 콘솔 → 내 앱 → 보안 → "Client Secret 사용"이 ON이어야 이 값이 유효함.
      // OFF 상태에서 Auth.js가 client_secret을 전송하면 KOE004 발생.
      // → 콘솔에서 "Client Secret 사용"을 활성화하고, 생성된 값을 AUTH_KAKAO_SECRET에 설정.
      clientSecret: process.env.AUTH_KAKAO_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false

      // 이메일 없이는 계정 식별 불가 — 제공자 동의항목 미동의가 주원인
      // false 대신 URL 반환하면 Auth.js v5가 해당 경로로 리다이렉트함
      if (!user.email) {
        console.warn(`[Auth] 이메일 미제공: provider=${account.provider}`)
        return '/login?error=NoEmail'
      }

      try {
        const isAdmin = ADMIN_EMAILS.includes(user.email)

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!existingUser) {
          // 새 사용자 생성
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: isAdmin ? 'ADMIN' : 'USER',
              profileComplete: false,
            },
          })

          // Account 연결
          await prisma.account.create({
            data: {
              userId: newUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          })
        } else {
          // 기존 사용자: 관리자 이메일이면 role 업데이트
          if (isAdmin && existingUser.role !== 'ADMIN') {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { role: 'ADMIN' },
            })
          }

          // Account 연결 확인
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          })

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
          }
        }

        return true
      } catch (error) {
        // 민감 정보(토큰·이메일) 미포함 — 오류 유형과 제공자만 기록
        console.error(
          `[Auth] 사용자 저장 오류: provider=${account.provider},`,
          error instanceof Error ? error.message : 'unknown error',
        )
        return '/login?error=ServerError'
      }
    },

    async jwt({ token, user, account, trigger, session }) {
      // 최초 로그인 시 또는 토큰 생성 시
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
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
          // DB에서 role 가져오되, ADMIN_EMAILS에 포함되면 ADMIN으로 강제 설정
          token.role = ADMIN_EMAILS.includes(dbUser.email || '') ? 'ADMIN' : dbUser.role
        }
      }

      // update() 호출 시 전달된 데이터로 갱신
      if (trigger === 'update' && session) {
        if (session.profileComplete !== undefined) {
          token.profileComplete = session.profileComplete
        }
        if (session.phone !== undefined) {
          token.phone = session.phone
        }
        if (session.addressBase !== undefined) {
          token.addressBase = session.addressBase
        }
        if (session.addressDetail !== undefined) {
          token.addressDetail = session.addressDetail
        }
        if (session.name !== undefined) {
          token.name = session.name
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