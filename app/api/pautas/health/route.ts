import { fetchGoogleNewsRss, resolveGoogleNewsUrl } from '@/app/lib/google_news'

// Diagnóstico do pipeline de pautas, executado no próprio servidor (Vercel) —
// é a forma de saber se o Google responde igual do datacenter e do seu IP.
// Sempre ao vivo: sem cache, fora do unstable_cache do news.ts.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const started = Date.now()
  const checks: Record<string, unknown> = {}

  // 1) Listagem via Google News RSS (com o mesmo when:5d das pautas).
  const t1 = Date.now()
  const items = await fetchGoogleNewsRss('imóveis "Santa Catarina" when:5d', 10)
  checks.rss = {
    ok: items.length > 0,
    count: items.length,
    ms: Date.now() - t1,
    sample: items[0]?.title ?? null,
  }

  // 2) Resolução de link Google -> URL real (a parte mais frágil em datacenter).
  if (items[0]?.link) {
    const t2 = Date.now()
    const resolved = await resolveGoogleNewsUrl(items[0].link)
    checks.resolver = {
      ok: Boolean(resolved),
      ms: Date.now() - t2,
      url: resolved,
    }
  } else {
    checks.resolver = { ok: false, skipped: 'sem item do RSS para resolver' }
  }

  // 3) GNews (fallback) está configurada?
  checks.gnews = {
    configured: Boolean(process.env.GNEWS_API && process.env.GNEWS_URL),
  }

  const ok =
    (checks.rss as { ok: boolean }).ok && (checks.resolver as { ok: boolean }).ok

  return Response.json(
    { ok, totalMs: Date.now() - started, checks },
    { status: ok ? 200 : 503 }
  )
}
