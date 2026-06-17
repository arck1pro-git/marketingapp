import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id, 10)

  const [item] = await sql`
    SELECT conteudo, tipo FROM calendario_item WHERE id = ${itemId}
  `
  if (!item) return Response.json({ error: 'Item não encontrado.' }, { status: 404 })

  const it = item as { conteudo: string; tipo: string | null }
  const tipo = it.tipo ?? 'produto'
  const ctxTipo = tipo === 'opinativo' ? 'fabricio' : 'ari'

  const ctxRows = await sql`
    SELECT context_text FROM context WHERE tipo = ${ctxTipo} ORDER BY id LIMIT 1
  `
  const contextText =
    (ctxRows[0] as { context_text: string } | undefined)?.context_text?.trim() ?? ''

  const prompt = `Você é um roteirista de conteúdo para Instagram.

## CONTEXTO (${ctxTipo})
${contextText || 'Sem contexto definido.'}

## IDEIA DO POST (tipo: ${tipo})
${it.conteudo}

Gere DOIS roteiros a partir dessa ideia, coerentes com o contexto e o tipo:
1. CARROSSEL: roteiro estruturado em slides (o texto de cada slide).
2. VÍDEO (45s): roteiro em TEXTO CORRIDO — a narração/fala pronta para gravar, com cerca de 45 segundos de duração. NÃO descreva cenas, NÃO use marcações de tempo nem indicações de câmera; escreva apenas o texto que será falado, em parágrafos corridos.

Responda SOMENTE com um JSON válido, sem texto adicional:
{ "carrossel": "<roteiro do carrossel>", "video": "<roteiro do vídeo de 45s>" }`

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API })
  let message
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return Response.json({ error: `Erro Claude: ${msg}` }, { status: 502 })
  }

  const block = message.content[0]
  const text = block?.type === 'text' ? block.text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return Response.json({ error: 'A IA não retornou roteiros válidos.' }, { status: 500 })
  }

  let parsed: { carrossel?: string; video?: string }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return Response.json({ error: 'Falha ao interpretar os roteiros.' }, { status: 500 })
  }

  const carrossel = (parsed.carrossel ?? '').trim()
  const video = (parsed.video ?? '').trim()

  await sql`
    UPDATE calendario_item
    SET roteiro_carrossel = ${carrossel}, roteiro_video = ${video}
    WHERE id = ${itemId}
  `

  return Response.json({ carrossel, video })
}
