import puppeteer from 'puppeteer'

// Resolve o link (inclusive o redirect do Google News) e extrai o texto da matéria.
// Lança Error('BLOCKED') quando o site bloqueia / exige login / não entrega conteúdo.
export async function fetchArticleText(link: string): Promise<{ text: string; url: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )

    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Aguarda eventual redirect (Google News → site do veículo)
    await page.waitForNetworkIdle({ idleTime: 1200, timeout: 12000 }).catch(() => {})

    const url = page.url()
    const raw: string = await page.evaluate(() => {
      const pick =
        document.querySelector('article') ||
        document.querySelector('main') ||
        document.body
      return pick ? (pick as HTMLElement).innerText : ''
    })

    const text = raw
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Ainda no Google/consent, ou conteúdo curto demais => tratamos como bloqueio.
    if (/news\.google\.com|consent\.google\.com/.test(url) || text.length < 400) {
      throw new Error('BLOCKED')
    }

    return { text: text.slice(0, 8000), url }
  } finally {
    await browser.close()
  }
}
