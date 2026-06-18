import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Next 16 renomeou a convenção `middleware` para `proxy` (roda no runtime Node.js,
// não no edge). Usa só a config edge-safe (sem banco); o callback `authorized`
// controla quem pode ver cada página.
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Roda em todas as rotas, exceto API, assets do Next e o favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
