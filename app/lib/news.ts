// Busca de notícias via GNews API (https://gnews.io). Compartilhado entre a
// Pauta e o Calendário Editorial (geração de roteiro a partir de matéria real).
// Token em GNEWS_API e endpoint em GNEWS_URL (.env).

export interface NewsItem {
  title: string
  description: string
  link: string
  image?: string
  pubDate?: string
}

// Termos de busca (sintaxe de query da GNews) por categoria.
// O plano grátis só ordena por publishedAt e só enxerga 12h–30 dias atrás, então
// as queries equilibram precisão x cobertura: temas largos usam 1–2 termos
// (E implícito entre palavras); o tema local de Porto Belo usa imóveis E as
// cidades da região (OR) para não vir notícia genérica da cidade.
export const QUERIES: Record<string, string> = {
  porto_belo:
    'imóveis AND ("Porto Belo" OR Itapema OR Bombinhas OR "Balneário Camboriú" OR Tijucas)',
  sc: 'imóveis "Santa Catarina"',
  investimentos: 'investimentos bolsa',
  imoveis: 'mercado imobiliário',
  geral: 'tendência viral',
}

// Categorias usadas por cada tipo de conteúdo do calendário (em ordem de preferência).
export const TIPO_FEEDS: Record<string, string[]> = {
  dados: ['investimentos', 'imoveis', 'sc'],
  produto: ['porto_belo', 'imoveis', 'sc'],
  opinativo: ['geral', 'investimentos'],
}

export function feedsForTipo(tipo: string | null): string[] {
  return TIPO_FEEDS[tipo ?? ''] ?? ['investimentos', 'imoveis']
}

import { unstable_cache } from 'next/cache'
import { fetchGoogleNewsRss } from './google_news'

interface GNewsArticle {
  title?: string
  description?: string
  url?: string
  image?: string
  publishedAt?: string
}

interface GNewsResponse {
  totalArticles?: number
  articles?: GNewsArticle[]
  errors?: string[]
}

// Janela máxima das pautas. Aplicada às duas fontes; itens sem data ou mais
// antigos que isso são descartados.
const MAX_AGE_DAYS = 5
function recent(items: NewsItem[]): NewsItem[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return items.filter((it) => {
    if (!it.pubDate) return false
    const t = new Date(it.pubDate).getTime()
    return !Number.isNaN(t) && t >= cutoff
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Espaçamento mínimo entre chamadas REAIS à GNews (o plano grátis bloqueia
// rajadas no mesmo segundo). Compartilhado por todos os chamadores.
const MIN_GAP_MS = 1200
let nextSlot = 0
async function throttle() {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS
  if (wait > 0) await sleep(wait)
}

// Busca uma categoria. Fonte primária: Google News RSS (grátis, tempo real, sem
// rate limit nem API key). Cai pra GNews só se o RSS voltar vazio. Nunca lança.
async function loadFeed(category: string, max: number): Promise<NewsItem[]> {
  const q = QUERIES[category]
  if (!q) return []

  // Primária: Google News RSS. Reusa a query da categoria (sintaxe AND/OR/"aspas"
  // compatível) + `when:5d` pra cortar no servidor. Links vêm ofuscados, mas o
  // fetch_article resolve ao ler o corpo.
  const rss = recent(await fetchGoogleNewsRss(`${q} when:${MAX_AGE_DAYS}d`, max))
  if (rss.length) return rss

  // Fallback: GNews (entrega thumbnail, mas tem rate limit e atraso de ~12h).
  return recent(await fetchGNews(q, max))
}

// Cache persistente entre instâncias serverless (Data Cache da Vercel), pra não
// bater no Google a cada request — o Map em memória não sobrevivia a cold start.
// keyParts + os argumentos (category, max) compõem a chave; revalida a cada 2h.
const cachedFeed = unstable_cache(loadFeed, ['pautas-feed'], {
  revalidate: 2 * 60 * 60,
  tags: ['pautas'],
})

export async function fetchFeedItems(category: string, max = 10): Promise<NewsItem[]> {
  return cachedFeed(category, max)
}

// Consulta a GNews. Nunca lança — devolve [] em falha. Repete em rate limit
// (a GNews responde 429, ou 200 com `errors`).
async function fetchGNews(q: string, max: number): Promise<NewsItem[]> {
  const token = process.env.GNEWS_API
  const base = process.env.GNEWS_URL
  if (!token || !base) return []

  const url = new URL(base)
  url.searchParams.set('q', q)
  url.searchParams.set('lang', 'pt')
  url.searchParams.set('country', 'br')
  url.searchParams.set('sortby', 'publishedAt')
  url.searchParams.set('max', String(Math.min(max, 10)))
  url.searchParams.set('apikey', token)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await throttle()
      const res = await fetch(url.toString(), {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      const data = (await res.json()) as GNewsResponse

      // Rate limit: 429 OU 200 com `errors` (a GNews usa ambos). Tenta de novo.
      const rateLimited = res.status === 429 || (Array.isArray(data.errors) && data.errors.length > 0)
      if (rateLimited) {
        await sleep(1500 * (attempt + 1))
        continue
      }
      if (!res.ok) break

      const items = (Array.isArray(data.articles) ? data.articles : [])
        .filter((a) => a.title && a.url)
        .slice(0, max)
        .map((a) => ({
          title: (a.title ?? '').trim(),
          description: (a.description ?? '').trim(),
          link: (a.url ?? '').trim(),
          image: a.image?.trim() || undefined,
          pubDate: a.publishedAt,
        }))

      return items
    } catch {
      await sleep(1500 * (attempt + 1))
    }
  }

  // Esgotou as tentativas (rate limit/erro).
  return []
}
