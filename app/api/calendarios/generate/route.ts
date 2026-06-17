import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

type Tipo = 'dados' | 'opinativo' | 'produto'

interface Body {
  mes: string // 'YYYY-MM'
  posicionamento: string
  dias: number[] // índices do dia da semana (0 = Dom ... 6 = Sáb)
  porDia: number // quantos conteúdos por dia
}

const TIPOS: Tipo[] = ['dados', 'produto', 'opinativo']

const TIPO_REGRA: Record<Tipo, string> = {
  dados:
    'dados → use o CONTEXTO ARI. Foque em MOSTRAR DADOS: um número, estatística ou fato concreto do mercado/investimentos e o que significa para o investidor.',
  produto:
    'produto → use o CONTEXTO ARI. FALE SOBRE O ARI (o ativo de renda imobiliário): um benefício, diferencial ou aspecto do produto.',
  opinativo:
    'opinativo → use o CONTEXTO FABRÍCIO. Traga um PONTO DE VISTA / opinião informada sobre mercado, investimentos ou comportamento, na voz do criador.',
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

  // Cada slot = um conteúdo (data + tipo aleatório).
  const slots: { data: string; tipo: Tipo }[] = []
  for (const data of datas) {
    for (let k = 0; k < perDay; k++) {
      slots.push({ data, tipo: TIPOS[Math.floor(Math.random() * TIPOS.length)] })
    }
  }

  // Carrega os dois contextos.
  const ctxRows = await sql`SELECT tipo, context_text FROM context WHERE tipo IN ('ari', 'fabricio')`
  const ctx: Record<string, string> = { ari: '', fabricio: '' }
  for (const r of ctxRows as { tipo: string; context_text: string }[]) {
    ctx[r.tipo] = r.context_text?.trim() ?? ''
  }

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API })

  // 1. Gera as IDEIAS do mês (uma chamada — garante coerência entre os dias).
  const slotList = slots.map((s, i) => `${i + 1}. ${s.data} — tipo: ${s.tipo}`).join('\n')
  const ideiasPrompt = `Você é um estrategista de conteúdo para Instagram.

## CONTEXTO ARI (usar nos tipos "dados" e "produto")
${ctx.ari || 'Sem contexto definido.'}

## CONTEXTO FABRÍCIO (usar no tipo "opinativo")
${ctx.fabricio || 'Sem contexto definido.'}

## POSICIONAMENTO DO MÊS
${posicionamento?.trim() || 'Sem direcionamento específico.'}

## REGRAS POR TIPO
- ${TIPO_REGRA.dados}
- ${TIPO_REGRA.produto}
- ${TIPO_REGRA.opinativo}

## SLOTS
Crie uma ideia de conteúdo (tema + breve descrição) para CADA slot, respeitando o tipo e o posicionamento:
${slotList}

Responda SOMENTE com um array JSON de strings, uma por slot e na MESMA ORDEM:
["ideia do slot 1", "ideia do slot 2", ...]`

  let ideias: string[]
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: ideiasPrompt }],
    })
    const b = msg.content[0]
    const t = b?.type === 'text' ? b.text : ''
    const jm = t.match(/\[[\s\S]*\]/)
    ideias = jm ? JSON.parse(jm[0]) : []
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return Response.json({ error: `Erro Claude: ${msg}` }, { status: 502 })
  }

  const comIdeia = slots
    .map((s, i) => ({ ...s, conteudo: ideias[i] }))
    .filter((s) => typeof s.conteudo === 'string' && s.conteudo.trim())
  if (comIdeia.length === 0) {
    return Response.json({ error: 'O calendário gerado veio vazio.' }, { status: 500 })
  }

  // 2. Para cada slot, gera os DOIS roteiros (carrossel + vídeo 45s).
  async function gerarRoteiros(conteudo: string, tipo: Tipo) {
    const ctxTipo = tipo === 'opinativo' ? 'fabricio' : 'ari'
    const prompt = `Você é um roteirista de conteúdo para Instagram.

## CONTEXTO (${ctxTipo})
${ctx[ctxTipo] || 'Sem contexto definido.'}

## IDEIA DO POST (tipo: ${tipo})
${conteudo}

Gere DOIS roteiros a partir dessa ideia, coerentes com o contexto e o tipo:
1. CARROSSEL: roteiro estruturado em slides (o texto de cada slide).
2. VÍDEO (45s): roteiro em TEXTO CORRIDO — a narração/fala pronta para gravar, com cerca de 45 segundos de duração. NÃO descreva cenas, NÃO use marcações de tempo nem indicações de câmera; escreva apenas o texto que será falado, em parágrafos corridos.

Responda SOMENTE com um JSON válido, sem texto adicional:
{ "carrossel": "<roteiro do carrossel>", "video": "<roteiro do vídeo de 45s>" }`
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })
      const b = msg.content[0]
      const t = b?.type === 'text' ? b.text : ''
      const jm = t.match(/\{[\s\S]*\}/)
      if (!jm) return { carrossel: '', video: '' }
      const p = JSON.parse(jm[0]) as { carrossel?: string; video?: string }
      return { carrossel: (p.carrossel ?? '').trim(), video: (p.video ?? '').trim() }
    } catch {
      return { carrossel: '', video: '' }
    }
  }

  const roteiros: { carrossel: string; video: string }[] = []
  const LIMIT = 6
  for (let i = 0; i < comIdeia.length; i += LIMIT) {
    const batch = comIdeia.slice(i, i + LIMIT)
    const res = await Promise.all(batch.map((s) => gerarRoteiros(s.conteudo, s.tipo)))
    roteiros.push(...res)
  }

  // 3. Salva calendário + itens (com ideia e os dois roteiros).
  const [y, m] = mes.split('-').map(Number)
  const nome = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const [row] = await sql`
    INSERT INTO calendario (nome, mes, posicionamento, tipo)
    VALUES (${nome}, ${mes}, ${posicionamento ?? ''}, 'misto')
    RETURNING id
  `
  const calId = (row as { id: number }).id

  for (let i = 0; i < comIdeia.length; i++) {
    const s = comIdeia[i]
    const r = roteiros[i] ?? { carrossel: '', video: '' }
    await sql`
      INSERT INTO calendario_item (calendario_id, data, conteudo, tipo, roteiro_carrossel, roteiro_video)
      VALUES (${calId}, ${s.data}, ${s.conteudo}, ${s.tipo}, ${r.carrossel}, ${r.video})
    `
  }

  return Response.json({ id: calId }, { status: 201 })
}
