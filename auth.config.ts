import type { NextAuthConfig } from 'next-auth'

// Configuração "edge-safe" (sem acesso ao banco) — usada pelo middleware.
export const authConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = nextUrl.pathname.startsWith('/login')

      if (isOnLogin) {
        // Logado tentando ver /login -> manda pra home
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl))
        return true
      }

      // Qualquer outra página exige login
      return isLoggedIn
    },
  },
} satisfies NextAuthConfig
