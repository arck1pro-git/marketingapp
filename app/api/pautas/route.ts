interface NewsItem {
  title: string
  description: string
  link: string
}

function parseItems(xml: string, max = 10): NewsItem[] {
  const items: NewsItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null

  while ((m = re.exec(xml)) !== null && items.length < max) {
    const block = m[1]

    const titleMatch =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
      block.match(/<title>([\s\S]*?)<\/title>/)

    const descMatch =
      block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ??
      block.match(/<description>([\s\S]*?)<\/description>/)

    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/)
    const link = (linkMatch?.[1] ?? '').trim()

    const title = (titleMatch?.[1] ?? '')
      .replace(/\s*-\s*[^-]*$/, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()

    const description = (descMatch?.[1] ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()

    if (title && link) items.push({ title, description, link })
  }

  return items
}

const FEEDS: Record<string, string> = {
  porto_belo:
    'https://news.google.com/rss/search?q=Porto+Belo+imóveis+incorporação+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  sc:
    'https://news.google.com/rss/search?q=mercado+imobiliário+Santa+Catarina+litoral+lançamento+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  investimentos:
    'https://news.google.com/rss/search?q=dinheiro+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  imoveis:
    'https://news.google.com/rss/search?q=mercado+imobiliário+imóveis+lançamento+Brasil+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  geral:
    'https://news.google.com/rss/search?q=celebridades+OR+famosos+OR+viral+OR+tendência+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
}

export async function GET() {
  const entries = await Promise.allSettled(
    Object.entries(FEEDS).map(async ([key, url]) => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      })
      const xml = res.ok ? await res.text() : ''
      return [key, parseItems(xml)] as const
    })
  )

  const data: Record<string, NewsItem[]> = {}
  for (const r of entries) {
    if (r.status === 'fulfilled') {
      const [key, items] = r.value
      data[key] = items
    }
  }

  return Response.json(data)
}
