import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

interface Slide {
  slide: number
  titulo: string
  texto: string
}

function parseSlidesFromText(text: string): Slide[] {
  // Accept "**Slide 1**" or "**Slide 1:**"
  const parts = text.split(/\*\*Slide\s+(\d+)\*\*:?/i)
  const slides: Slide[] = []

  for (let i = 1; i < parts.length; i += 2) {
    const slideNum = parseInt(parts[i], 10)
    const content = (parts[i + 1] ?? '').trim()

    const titleMatch = content.match(/[Tt][íi]tulo:\s*(.+?)(?:\n|$)/)
    const titulo = (titleMatch?.[1] ?? '').replace(/^\[|\]$/g, '').trim()

    // Try "Texto: ..." label first; fall back to everything after the title line
    const textLabelMatch = content.match(/[Tt]exto:\s*([\s\S]+)/)
    let texto: string
    if (textLabelMatch) {
      texto = textLabelMatch[1].replace(/^\[|\]$/g, '').trim()
    } else {
      const afterTitle = titleMatch
        ? content.slice(content.indexOf(titleMatch[0]) + titleMatch[0].length)
        : content
      texto = afterTitle.replace(/^\[|\]$/g, '').trim()
    }

    if (texto) slides.push({ slide: slideNum, titulo, texto })
  }

  return slides
}

const FUNNEL_DESC: Record<string, string> = {
  Topo: 'Conteúdo para atrair audiência nova, que ainda não conhece o perfil. Tema mais amplo, acessível a quem se interessa por arte ou cultura.',
  Meio: 'Conteúdo para quem já acompanha e se interessa por tatuagem. Pode ir mais fundo no tema, pressupor conhecimento básico do mercado.',
  Fundo: 'Conteúdo para quem já quer tatuar ou já é tatuado. Pode ser mais específico, técnico ou direto sobre o processo, estilo ou decisão.',
}

export async function POST(req: Request) {
  // Read context from DB
  const ctxRows = await sql`SELECT context_text FROM context WHERE tipo = 'ari' ORDER BY id LIMIT 1`
  const contextText: string =
    (ctxRows[0] as { context_text: string } | undefined)?.context_text?.trim() ?? ''

  // Try to parse pauta body
  let title = ''
  let description = ''
  let funnelLevel = ''
  let userSuggestion = ''
  let pautaMode = false

  try {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      const body = await req.json()
      if (body?.newsTitle) {
        pautaMode = true
        title = body.newsTitle as string
        description = (body.newsDescription as string) ?? ''
        funnelLevel = (body.funnelLevel as string) ?? ''
        userSuggestion = (body.userSuggestion as string) ?? ''
      }
    }
  } catch {
    // auto mode
  }

  // Auto mode: fetch from RSS
  if (!pautaMode) {
    const rssRes = await fetch(process.env.NEWS_API!, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })

    if (!rssRes.ok) {
      return Response.json({ error: `Falha ao buscar RSS: ${rssRes.status}` }, { status: 502 })
    }

    const rssText = await rssRes.text()
    const itemMatch = rssText.match(/<item>([\s\S]*?)<\/item>/)
    if (!itemMatch) {
      return Response.json({ error: 'Nenhuma notícia encontrada no RSS.' }, { status: 500 })
    }

    const item = itemMatch[1]

    const titleMatch =
      item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
      item.match(/<title>([\s\S]*?)<\/title>/)
    const rawTitle = titleMatch?.[1]?.trim() ?? 'Tatuagem'
    title = rawTitle
      .replace(/\s*-\s*.*$/, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()

    const descMatch =
      item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ??
      item.match(/<description>([\s\S]*?)<\/description>/)
    description =
      descMatch?.[1]
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim() ?? ''
  }

  const contexto = contextText || 'Nenhum contexto definido.'
  const noticia = `${title}\n\n${description}`

  const funnelBlock = funnelLevel
    ? `\n## NÍVEL DO FUNIL\n${funnelLevel}: ${FUNNEL_DESC[funnelLevel] ?? ''}`
    : ''

  const suggestionBlock = userSuggestion
    ? `\n## SUGESTÃO DO CRIADOR\n"${userSuggestion}"\nUse isso como direcionamento de abordagem.`
    : ''

  const systemPrompt = `Você cria conteúdo sobre tatuagem para Instagram. Seu trabalho é informar com clareza, não impressionar com palavras.

---

## CONTEXTO DO CRIADOR
${contexto}

---

## NOTÍCIA / TEMA DE REFERÊNCIA
${noticia}
${funnelBlock}
${suggestionBlock}

---

## SUA TAREFA

OBRIGATÓRIO: o carrossel deve ter no mínimo 4 slides e no máximo 6. Nunca entregue menos de 4.

Crie um carrossel de Instagram seguindo este fluxo:

- Slide 1 → Apenas um título direto sobre o tema e uma pergunta que provoque curiosidade ou reflexão. Nada mais.
- Slide 2 → O que a notícia diz. Dados, fatos, o que aconteceu de concreto.
- Slides 3 até o penúltimo → Desenvolvimento. Entre 2 e 4 slides. O que isso significa para quem tatua ou é tatuado. Consequências práticas, contexto do mercado. Cada slide avança um ponto diferente.
- Último slide → Conclusão objetiva. O que fica depois de ler tudo isso.

---

## TOM

- Direto. Cada frase carrega informação.
- Sem metáforas, sem linguagem poética, sem palavras de efeito.
- Escreva como um profissional que conhece o mercado e fala com outros profissionais.
- Nada de "arte na pele", "expressão da alma" ou qualquer romantização da tatuagem.

---

## FORMATO DE SAÍDA

Siga este formato exatamente, incluindo os labels "Título:" e "Texto:":

**Slide 1**
Título: [título direto]
Texto: [uma única pergunta]

**Slide 2**
Texto: [corpo do slide]

**Slide 3**
Texto: [corpo do slide]

**Slide 4**
Texto: [corpo do slide]

*(adicione Slide 5 e Slide 6 se necessário)*

---

## REGRAS DE FORMATO

- Apenas o slide 1 tem título
- O slide 1 tem apenas uma pergunta como texto, curta, sem desenvolvimento
- Os outros slides têm só "Texto:" seguido do conteúdo, sem título, sem número
- Entre 25 e 35 palavras por slide (exceto slide 1, que é só a pergunta)
- Sem hashtags, sem emojis

---

## PROIBIDO

- Linguagem poética ou metafórica
- Adjetivos vagos: "incrível", "único", "poderoso", "transformador"
- "não é sobre X, é sobre Y"
- "Em um mundo onde...", "Vivemos em uma época em que..."
- "no final do dia", "no fim das contas"
- Qualquer frase que soe como motivação de palestra`

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API })

  const MAX_ATTEMPTS = 3
  let slides: Slide[] = []
  let lastContent = ''

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let message
    try {
      message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: systemPrompt }],
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido'
      return Response.json({ error: `Erro Claude: ${msg}` }, { status: 502 })
    }

    const block = message.content[0]
    lastContent = block?.type === 'text' ? block.text : ''

    if (!lastContent) {
      return Response.json({ error: 'Claude não retornou conteúdo.' }, { status: 500 })
    }

    slides = parseSlidesFromText(lastContent)
    if (slides.length >= 4) break
  }

  if (slides.length < 4) {
    return Response.json(
      { error: 'Não foi possível gerar 4 slides após várias tentativas.', raw: lastContent },
      { status: 500 }
    )
  }

  return Response.json({ slides, newsTitle: title })
}
