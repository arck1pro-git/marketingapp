import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Middleware usa só a config edge-safe (sem banco). O callback `authorized`
// controla quem pode ver cada página.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  // Roda em todas as rotas, exceto API, assets do Next e o favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
