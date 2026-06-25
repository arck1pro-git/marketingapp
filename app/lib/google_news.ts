// Fonte primária de manchetes (news.ts), via Google News RSS — grátis, sem API
// key nem rate limit. O cache fica em news.ts (unstable_cache, persistente na
// Vercel); aqui as funções são sempre "ao vivo".
//
// Pegadinha: o <link> do Google News RSS não é a URL real da matéria, e sim um
// redirect ofuscado (news.google.com/rss/articles/CBMi...). O método antigo de
// decodificar base64 quebrou em 2024; hoje é preciso uma chamada ao endpoint
// `batchexecute` do Google. Por isso a listagem (rápida) guarda o link do Google
// e a resolução pra URL real (lenta, best-effort) só acontece na hora de ler o
// corpo — veja resolveGoogleNewsUrl, chamado por fetch_article.ts.
//
// Em IP de datacenter (Vercel) o Google às vezes responde com página de
// consentimento em vez do feed/artigo: detectamos isso e tratamos como falha,
// pra cair no fallback em vez de devolver lixo. Todo fetch tem timeout pra não
// pendurar a função serverless até o limite de duração.

import type { NewsItem } from './news'

const RSS_BASE = 'https://news.google.com/rss/search'
const UA = 'Mozilla/5.0'
const FETCH_TIMEOUT_MS = 8000

// True quando o corpo é a página de consentimento/captcha do Google, não o dado.
function isConsent(body: string): boolean {
  return /consent\.google\.com|consent\.youtube\.com|gdpr|CONSENT_PENDING/i.test(body)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function firstTag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? decodeEntities(m[1].trim()) : ''
}

// O Google sufixa o veículo no título: "Manchete real - Nome do Veículo".
function splitTitleSource(raw: string): { title: string; source: string } {
  const i = raw.lastIndexOf(' - ')
  if (i === -1) return { title: raw, source: '' }
  return { title: raw.slice(0, i).trim(), source: raw.slice(i + 3).trim() }
}

// Lista manchetes do Google News RSS para uma query. Nunca lança — devolve [] em
// falha. A query aceita a mesma sintaxe da busca (AND/OR/"aspas").
export async function fetchGoogleNewsRss(query: string, max = 10): Promise<NewsItem[]> {
  if (!query) return []

  const url = new URL(RSS_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'pt-BR')
  url.searchParams.set('gl', 'BR')
  url.searchParams.set('ceid', 'BR:pt-419')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, text/xml' },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return []

    const xml = await res.text()
    // Sem <item> (consentimento/captcha/HTML inesperado): trata como vazio.
    if (isConsent(xml) || !xml.includes('<item>')) return []
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []

    const items: NewsItem[] = blocks.slice(0, max).map((block) => {
      const { title, source } = splitTitleSource(firstTag(block, 'title'))
      // A description vem como HTML; tira as tags e fica com o texto.
      const desc = firstTag(block, 'description')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return {
        title,
        description: desc && desc !== title ? desc : source,
        link: firstTag(block, 'link'),
        pubDate: firstTag(block, 'pubDate') || undefined,
      }
    })

    return items.filter((it) => it.title && it.link)
  } catch {
    return []
  }
}

// Extrai o id da matéria do link do Google News (.../articles/<ID>?...).
function articleId(link: string): string | null {
  const m = link.match(/\/articles\/([^?/]+)/)
  return m ? m[1] : null
}

// Busca os parâmetros de assinatura que o batchexecute exige, embutidos no HTML
// da página de redirect do artigo (data-n-a-sg / data-n-a-ts).
async function decodingParams(id: string): Promise<{ sg: string; ts: string } | null> {
  const res = await fetch(`https://news.google.com/rss/articles/${id}`, {
    headers: { 'User-Agent': UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) return null
  const html = await res.text()
  if (isConsent(html)) return null
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
  if (!sg || !ts) return null
  return { sg, ts }
}

// Resolve um link do Google News RSS para a URL real da matéria. Devolve null em
// qualquer falha (o chamador deve ter fallback). Best-effort: depende de um
// endpoint interno do Google, que pode mudar sem aviso.
export async function resolveGoogleNewsUrl(link: string): Promise<string | null> {
  try {
    const id = articleId(link)
    if (!id) return null

    const params = await decodingParams(id)
    if (!params) return null

    const inner = JSON.stringify([
      'garturlreq',
      [
        ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
        'X',
        'X',
        1,
        [1, 1, 1],
        1,
        1,
        null,
        0,
        0,
        null,
        0,
      ],
      id,
      Number(params.ts),
      params.sg,
    ])
    const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner]]]))

    const res = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': UA,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null

    // Resposta vem com prefixo anti-JSON e os dados aninhados/escapados duas vezes:
    // [["wrb.fr","Fbv4je","[\"garturlres\",\"https://url-real\"]",...]]
    const text = await res.text()
    const header = JSON.parse(text.split('\n\n')[1])
    const decoded = JSON.parse(header[0][2])
    const url = decoded[1]
    return typeof url === 'string' && url.startsWith('http') ? url : null
  } catch {
    return null
  }
}
