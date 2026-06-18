import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { fetchFeedItems, feedsForTipo, type NewsItem } from '@/app/lib/news'

export const maxDuration = 120

type Tipo = 'dados' | 'opinativo' | 'produto'

interface Body {
  mes: string // 'YYYY-MM'
  posicionamento: string
  dias: number[] // índices do dia da semana (0 = Dom ... 6 = Sáb)
  porDia: number // quantos conteúdos por dia
}

interface Slot {
  data: string
  tipo: Tipo
  usaMateria: boolean
  conteudo: string
  fonteTitulo: string | null
  fonteUrl: string | null
}

function monthDates(mes: string, dias: number[]): string[] {
  const [y, m] = mes.split('-').map(Number)
  if (!y || !m) return []
  const last = new Date(y, m, 0).getDate()
  const set = new Set(dias)
  const out: string[] = []
  for (let d = 1; d <= last; d++) {
    const wd = new Date(y, m - 1, d).getDay()
    if (set.has(wd)) out.push(`${mes}-${String(d).padStart(2, '0')}`)
  }
  return out
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Tipos do dia: no máximo UM 'dados'; os demais variam entre produto e opinativo.
function tiposDoDia(perDay: number): Tipo[] {
  const types: Tipo[] = []
  if (Math.random() < 0.6) types.push('dados') // ~60% dos dias têm 1 conteúdo de dados
  while (types.length < perDay) {
    types.push(Math.random() < 0.5 ? 'produto' : 'opinativo')
  }
  return shuffle(types).slice(0, perDay)
}

export async function POST(req: Request) {
  const { mes, posicionamento, dias, porDia } = (await req.json()) as Body

  if (!mes) return Response.json({ error: 'Selecione o mês.' }, { status: 400 })
  if (!Array.isArray(dias) || dias.length === 0) {
    return Response.json({ error: 'Selecione ao menos um dia da semana.' }, { status: 400 })
  }

  const perDay = Math.min(Math.max(Math.floor(porDia) || 1, 1), 5)

  const datas = monthDates(mes, dias)
  if (datas.length === 0) {
    return Response.json({ error: 'Nenhuma data no mês para os dias escolhidos.' }, { status: 400 })
  }

  // Monta os slots. 'dados' SEMPRE usa matéria (precisa de número real);
  // produto/opinativo sorteiam entre matéria e conteúdo geral.
  const slots: Slot[] = []
  for (const data of datas) {
    for (const tipo of tiposDoDia(perDay)) {
      const usaMateria = tipo === 'dados' ? true : Math.random() < 0.5
      slots.push({ data, tipo, usaMateria, conteudo: '', fonteTitulo: null, fonteUrl: null })
    }
  }

  // 1. Slots COM matéria: pega manchetes reais do RSS (rápido, sem Puppeteer).
  const cats = Array.from(
    new Set(slots.filter((s) => s.usaMateria).flatMap((s) => feedsForTipo(s.tipo)))
  )
  const feedCache: Record<string, NewsItem[]> = {}
  await Promise.all(
    cats.map(async (c) => {
      feedCache[c] = await fetchFeedItems(c, 10)
    })
  )

  function poolFor(tipo: Tipo): NewsItem[] {
    const seen = new Set<string>()
    const out: NewsItem[] = []
    for (const c of feedsForTipo(tipo)) {
      for (const n of feedCache[c] ?? []) {
        if (!seen.has(n.link)) {
          seen.add(n.link)
          out.push(n)
        }
      }
    }
    return out
  }
  const pools: Record<Tipo, NewsItem[]> = {
    dados: poolFor('dados'),
    produto: poolFor('produto'),
    opinativo: poolFor('opinativo'),
  }
  const idx: Record<Tipo, number> = { dados: 0, produto: 0, opinativo: 0 }

  for (const s of slots) {
    if (!s.usaMateria) continue
    const pool = pools[s.tipo]
    if (pool.length === 0) {
      s.usaMateria = false // sem matéria disponível agora → vira conteúdo geral
      continue
    }
    const n = pool[idx[s.tipo] % pool.length]
    idx[s.tipo]++
    s.conteudo = n.title
    s.fonteTitulo = n.title
    s.fonteUrl = n.link
  }

  // 2. Slots SEM matéria: gera ideias GERAIS (sem dados) com a Claude.
  const ctxRows = await sql`SELECT tipo, context_text FROM context WHERE tipo IN ('ari', 'fabricio')`
  const ctx: Record<string, string> = { ari: '', fabricio: '' }
  for (const r of ctxRows as { tipo: string; context_text: string }[]) {
    ctx[r.tipo] = r.context_text?.trim() ?? ''
  }

  const gerais = slots.filter((s) => !s.usaMateria)
  if (gerais.length > 0) {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API })
    const lista = gerais.map((s, i) => `${i + 1}. ${s.data} — tipo: ${s.tipo}`).join('\n')
    const prompt = `Você é um estrategista de conteúdo para Instagram.

## CONTEXTO ARI (tipo "produto")
${ctx.ari || 'Sem contexto definido.'}

## CONTEXTO FABRÍCIO (tipo "opinativo")
${ctx.fabricio || 'Sem contexto definido.'}

## POSICIONAMENTO DO MÊS
${posicionamento?.trim() || 'Sem direcionamento específico.'}

## REGRAS
- Cada ideia é um tema GERAL (sem notícia). NÃO use dados, números nem estatísticas.
- "produto": fale sobre o ARI (ativo de renda imobiliário em Porto Belo/SC) — benefício, diferencial ou aspecto do produto.
- "opinativo": um ponto de vista / opinião na voz do criador, sobre comportamento ou mercado, sem citar dados.

## SLOTS
Crie uma ideia (tema + breve descrição) para CADA slot, respeitando o tipo e o posicionamento:
${lista}

Responda SOMENTE com um array JSON de strings, uma por slot e na MESMA ORDEM:
["ideia do slot 1", "ideia do slot 2", ...]`

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      })
      const b = msg.content[0]
      const t = b?.type === 'text' ? b.text : ''
      const jm = t.match(/\[[\s\S]*\]/)
      const ideias: string[] = jm ? JSON.parse(jm[0]) : []
      gerais.forEach((s, i) => {
        s.conteudo = (ideias[i] ?? '').trim()
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erro desconhecido'
      return Response.json({ error: `Erro Claude: ${msg}` }, { status: 502 })
    }
  }

  // Mantém só slots com conteúdo (ideia geral pode ter vindo vazia).
  const finais = slots.filter((s) => s.conteudo.trim())
  if (finais.length === 0) {
    return Response.json({ error: 'O calendário gerado veio vazio.' }, { status: 500 })
  }

  // 3. Salva calendário + itens (roteiros são gerados sob demanda ao abrir).
  const [y, m] = mes.split('-').map(Number)
  const nome = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const [row] = await sql`
    INSERT INTO calendario (nome, mes, posicionamento, tipo)
    VALUES (${nome}, ${mes}, ${posicionamento ?? ''}, 'misto')
    RETURNING id
  `
  const calId = (row as { id: number }).id

  for (const s of finais) {
    await sql`
      INSERT INTO calendario_item
        (calendario_id, data, conteudo, tipo, roteiro_carrossel, roteiro_video, fonte_titulo, fonte_url)
      VALUES
        (${calId}, ${s.data}, ${s.conteudo}, ${s.tipo}, '', '', ${s.fonteTitulo}, ${s.fonteUrl})
    `
  }

  return Response.json({ id: calId }, { status: 201 })
}
