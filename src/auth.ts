import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Naver from 'next-auth/providers/naver'
import Kakao from 'next-auth/providers/kakao'
import { prisma } from '@/lib/prisma'
import { safeRedirect } from '@/lib/redirect'
import { isSuperAdminEmail } from '@/lib/admin-roles'

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Netlify/preview 환경 등 AUTH_URL이 없어도 동작하도록 trustHost를 활성화
  // 프로덕션에서는 AUTH_URL(또는 NEXTAUTH_URL)로 origin을 고정할 것
  trustHost: true,
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
        const isAdmin = isSuperAdminEmail(user.email)

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
          // 최고관리자 이메일은 DB에서도 ADMIN으로 유지한다.
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

    async jwt({ token, user, account, trigger }) {
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
          token.role = isSuperAdminEmail(dbUser.email) ? 'ADMIN' : dbUser.role
          token.isSuperAdmin = isSuperAdminEmail(dbUser.email)
        }
      }

      // Session updates must use persisted data, never client-supplied completion flags.
      if (trigger === 'update' && token.id) {
        const profile = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (profile) {
          token.name = profile.name
          token.phone = profile.phone
          token.addressBase = profile.addressBase
          token.addressDetail = profile.addressDetail
          token.profileComplete = profile.profileComplete
          token.role = isSuperAdminEmail(profile.email) ? 'ADMIN' : profile.role
          token.isSuperAdmin = isSuperAdminEmail(profile.email)
        } else {
          token.profileComplete = false
          token.isSuperAdmin = false
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.name = token.name
        session.user.id = token.id as string
        session.user.role = token.role as 'USER' | 'ADMIN'
        session.user.isSuperAdmin = token.isSuperAdmin === true
        session.user.profileComplete = token.profileComplete as boolean
        session.user.phone = token.phone as string | null | undefined
        session.user.addressBase = token.addressBase as string | null | undefined
        session.user.addressDetail = token.addressDetail as string | null | undefined
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      return safeRedirect(url, baseUrl)
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
      isSuperAdmin: boolean
      profileComplete: boolean
    }
  }
}
