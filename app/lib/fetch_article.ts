// Leitura do texto da matéria via Jina Reader (https://r.jina.ai). Substitui o
// Puppeteer/Chromium: o Jina resolve a página (inclusive JS/redirect) e devolve
// o conteúdo já em texto/markdown limpo, sem precisar de browser headless.

import { resolveGoogleNewsUrl } from './google_news'

const JINA = 'https://r.jina.ai/'
// Jina processa a página inteira, então é mais lento que um fetch normal — mas
// com teto pra não pendurar a função serverless até o limite de duração.
const JINA_TIMEOUT_MS = 12000

// Lê uma matéria pelo Jina Reader.
// Lança Error('BLOCKED') quando o Jina falha ou o conteúdo vem curto demais.
export async function fetchArticleText(link: string): Promise<{ text: string; url: string }> {
  // Links do Google News RSS são redirects ofuscados; o Jina não enxerga a
  // matéria por trás deles. Resolve pra URL real antes de ler (best-effort).
  let target = link
  if (link.includes('news.google.com')) {
    const real = await resolveGoogleNewsUrl(link)
    if (real) target = real
  }

  let res: Response
  try {
    res = await fetch(JINA + target, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
    })
  } catch {
    throw new Error('BLOCKED')
  }

  if (!res.ok) throw new Error('BLOCKED')

  const raw = await res.text()
  const text = raw
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (text.length < 400) throw new Error('BLOCKED')

  return { text: text.slice(0, 8000), url: target }
}

// Tenta ler uma lista de links em ordem, pulando os que falharem. Devolve a
// primeira matéria acessível (com o índice do link que funcionou) ou null.
export async function readFirstAccessible(
  links: string[],
  maxTries = 6
): Promise<{ text: string; url: string; index: number } | null> {
  const tries = links.slice(0, maxTries)
  for (let i = 0; i < tries.length; i++) {
    try {
      const r = await fetchArticleText(tries[i])
      return { ...r, index: i }
    } catch {
      // bloqueado ou erro de acesso — segue para a próxima matéria
    }
  }
  return null
}
