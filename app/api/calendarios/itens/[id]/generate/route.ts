import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { fetchFeedItems, feedsForTipo } from '@/app/lib/news'
import { readFirstAccessible } from '@/app/lib/fetch_article'

export const maxDuration = 300

const TIPO_REGRA: Record<string, string> = {
  dados:
    'Tipo DADOS: foque em um número, estatística ou fato concreto e explique o que significa para o investidor.',
  produto:
    'Tipo PRODUTO: fale sobre o ARI (ativo de renda imobiliário em Porto Belo/SC) — um benefício, diferencial ou aspecto do produto.',
  opinativo:
    'Tipo OPINATIVO: traga um ponto de vista / opinião informada, na voz do criador.',
}

interface Body {
  formato: 'carrossel' | 'video'
  auditoriaId: number
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id, 10)
  const { formato, auditoriaId } = (await req.json()) as Body

  if (formato !== 'carrossel' && formato !== 'video') {
    return Response.json({ error: 'Formato inválido.' }, { status: 400 })
  }
  if (!auditoriaId) {
    return Response.json({ error: 'Selecione uma auditoria.' }, { status: 400 })
  }

  const [item] = await sql`
    SELECT conteudo, tipo, fonte_titulo, fonte_url FROM calendario_item WHERE id = ${itemId}
  `
  if (!item) return Response.json({ error: 'Item não encontrado.' }, { status: 404 })
  const it = item as {
    conteudo: string
    tipo: string | null
    fonte_titulo: string | null
    fonte_url: string | null
  }
  const tipo = it.tipo ?? 'produto'
  const usaMateria = !!it.fonte_url

  const [aud] = await sql`SELECT nome, prompt FROM auditoria WHERE id = ${auditoriaId}`
  if (!aud) return Response.json({ error: 'Auditoria não encontrada.' }, { status: 404 })
  const audit = aud as { nome: string; prompt: string }

  const ctxTipo = tipo === 'opinativo' ? 'fabricio' : 'ari'
  const ctxRows = await sql`
    SELECT context_text FROM context WHERE tipo = ${ctxTipo} ORDER BY id LIMIT 1
  `
  const contextText =
    (ctxRows[0] as { context_text: string } | undefined)?.context_text?.trim() ?? ''

  const isVideo = formato === 'video'
  const formatoInstr = isVideo
    ? 'Vídeo (~45s): roteiro em TEXTO CORRIDO — a narração/fala pronta para gravar, sem descrição de cenas nem marcações de tempo/câmera. Apenas o texto que será falado, em parágrafos.'
    : 'Carrossel: estruture o roteiro em slides (o texto de cada slide).'

  // Bloco de material: matéria real (Puppeteer) OU conteúdo geral (sem dados).
  let materialBlock: string
  let fonteTitulo = it.fonte_titulo
  let fonteUrl = it.fonte_url

  if (usaMateria) {
    // Tenta a matéria salva primeiro; se bloquear, parte para as do feed do tipo.
    const seen = new Set<string>()
    const links: string[] = []
    const titleByLink = new Map<string, string>()
    if (it.fonte_url) {
      seen.add(it.fonte_url)
      links.push(it.fonte_url)
      if (it.fonte_titulo) titleByLink.set(it.fonte_url, it.fonte_titulo)
    }
    for (const cat of feedsForTipo(tipo)) {
      for (const n of await fetchFeedItems(cat, 10)) {
        if (!seen.has(n.link)) {
          seen.add(n.link)
          links.push(n.link)
          titleByLink.set(n.link, n.title)
        }
      }
    }

    const found = await readFirstAccessible(links, 6)
    if (!found) {
      return Response.json(
        {
          error:
            'Não consegui acessar nenhuma matéria: os sites bloquearam o acesso ou exigem login. Tente novamente.',
        },
        { status: 502 }
      )
    }
    const usedLink = links[found.index]
    fonteTitulo = titleByLink.get(usedLink) ?? it.fonte_titulo ?? 'matéria'
    fonteUrl = found.url
    materialBlock = `## MATERIAL (matéria real: "${fonteTitulo}")
${found.text}

Use APENAS fatos presentes na matéria — NUNCA invente dados, números ou estatísticas.`
  } else {
    materialBlock = `## SEM MATÉRIA
Este conteúdo NÃO se baseia em notícia. Use conhecimento geral e o contexto. NÃO use dados, números nem estatísticas — faça um conteúdo qualitativo.`
  }

  const prompt = `Você é um roteirista de conteúdo para Instagram.

## CONTEXTO (${ctxTipo})
${contextText || 'Sem contexto definido.'}

${materialBlock}

## TEMA / IDEIA DO POST (tipo: ${tipo})
${it.conteudo}

## REGRA DO TIPO
${TIPO_REGRA[tipo] ?? ''}

## AUDITORIA — "${audit.nome}" (diretrizes obrigatórias de construção do roteiro)
${audit.prompt}

## FORMATO
${formatoInstr}

Escreva apenas o roteiro final em português, pronto para uso, sem comentários extras.`

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
  const texto = block?.type === 'text' ? block.text.trim() : ''
  if (!texto) return Response.json({ error: 'A IA não retornou conteúdo.' }, { status: 500 })

  // Salva no formato selecionado e atualiza a fonte efetivamente usada.
  if (isVideo) {
    await sql`
      UPDATE calendario_item
      SET roteiro_video = ${texto}, fonte_titulo = ${fonteTitulo}, fonte_url = ${fonteUrl}
      WHERE id = ${itemId}
    `
  } else {
    await sql`
      UPDATE calendario_item
      SET roteiro_carrossel = ${texto}, fonte_titulo = ${fonteTitulo}, fonte_url = ${fonteUrl}
      WHERE id = ${itemId}
    `
  }

  return Response.json({
    texto,
    formato,
    fonte: usaMateria ? { titulo: fonteTitulo, url: fonteUrl } : null,
  })
}
