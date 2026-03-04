import NextAuth from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'

const ADMIN_EMAILS = ['dnffkffk486@gmail.com']

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!account || !user.email) return true

      try {
        const isAdmin = ADMIN_EMAILS.includes(user.email)

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: isAdmin ? 'ADMIN' : 'USER',
              profileComplete: false,
            },
          })

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
          if (isAdmin && existingUser.role !== 'ADMIN') {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { role: 'ADMIN' },
            })
          }

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
      } catch (error) {
        console.error('사용자 생성/조회 오류:', error)
      }

      return true
    },

    async jwt({ token, user, account, trigger, session }) {
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
          token.role = ADMIN_EMAILS.includes(dbUser.email || '') ? 'ADMIN' : dbUser.role
        }
      }

      if (trigger === 'update' && session) {
        if (session.profileComplete !== undefined) token.profileComplete = session.profileComplete
        if (session.phone !== undefined) token.phone = session.phone
        if (session.addressBase !== undefined) token.addressBase = session.addressBase
        if (session.addressDetail !== undefined) token.addressDetail = session.addressDetail
        if (session.name !== undefined) token.name = session.name
      }

      return token
    },
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
