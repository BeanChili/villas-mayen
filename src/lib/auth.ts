import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from './db'

interface ExtendedToken {
  id: string
  username: string
  roleId?: string
  roleName?: string
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { role: true },
        })

        if (!user || !user.active) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email || '',
          username: user.username,
          roleId: user.roleId,
          roleName: user.role?.name || '',
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.roleId = (user as any).roleId
        token.roleName = (user as any).roleName
      }

      // Tokens emitidos antes del sistema de roles no traen roleId:
      // se resuelve una vez desde la base y queda en el token.
      if (!token.roleId && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { role: true },
        })
        if (dbUser) {
          token.roleId = dbUser.roleId
          token.roleName = dbUser.role?.name || ''
        }
      }

      return token
    },
    async session({ session, token }) {
      const extendedToken = token as unknown as ExtendedToken
      if (session.user) {
        session.user.id = extendedToken.id
        session.user.username = extendedToken.username
        session.user.roleId = extendedToken.roleId || ''
        session.user.roleName = extendedToken.roleName || ''
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'villas-mayen-secret-key-change-in-production',
}
