import type { Browser, Page } from 'puppeteer-core'

// No Vercel (serverless) usamos puppeteer-core + @sparticuz/chromium, pois o
// Chromium completo do `puppeteer` não roda/cabe no ambiente Lambda.
// Localmente usamos o `puppeteer` completo (Chromium embutido).
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }
  const puppeteer = (await import('puppeteer')).default
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  return browser as unknown as Browser
}

// Lê uma página já aberta e extrai o texto da matéria.
// Lança Error('BLOCKED') quando o site bloqueia / exige login / não entrega conteúdo.
async function readWithPage(page: Page, link: string): Promise<{ text: string; url: string }> {
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
}

// Resolve o link (inclusive o redirect do Google News) e extrai o texto da matéria.
export async function fetchArticleText(link: string): Promise<{ text: string; url: string }> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    return await readWithPage(page, link)
  } finally {
    await browser.close()
  }
}

// Tenta ler uma lista de links em ordem, num único browser, pulando os que
// bloquearem. Devolve a primeira matéria acessível (com o índice do link que
// funcionou) ou null se nenhuma abrir.
export async function readFirstAccessible(
  links: string[],
  maxTries = 6
): Promise<{ text: string; url: string; index: number } | null> {
  const browser = await launchBrowser()
  try {
    const tries = links.slice(0, maxTries)
    for (let i = 0; i < tries.length; i++) {
      const page = await browser.newPage()
      try {
        const r = await readWithPage(page, tries[i])
        return { ...r, index: i }
      } catch {
        // bloqueado ou erro de acesso — segue para a próxima matéria
      } finally {
        await page.close().catch(() => {})
      }
    }
    return null
  } finally {
    await browser.close()
  }
}
