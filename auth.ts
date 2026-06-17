import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        nome: { label: 'Nome' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const nome = (credentials?.nome as string | undefined)?.trim()
        const senha = credentials?.senha as string | undefined
        if (!nome || !senha) return null

        const rows = await sql`
          SELECT id, nome, senha FROM usuario WHERE nome = ${nome} LIMIT 1
        `
        const user = rows[0] as
          | { id: number; nome: string; senha: string }
          | undefined
        if (!user) return null

        // Aceita senha em hash bcrypt ($2...) ou texto puro (uso interno).
        const ok = user.senha.startsWith('$2')
          ? await bcrypt.compare(senha, user.senha)
          : senha === user.senha
        if (!ok) return null

        return { id: String(user.id), name: user.nome }
      },
    }),
  ],
})
