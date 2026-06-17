import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { fetchArticleText } from '@/app/lib/fetch_article'

export const maxDuration = 120

interface Body {
  link: string
  newsTitle: string
  publico: string
  auditoriaId: number
  formato: 'carrossel' | 'video'
  tempo?: number
}

export async function POST(req: Request) {
  const { link, newsTitle, publico, auditoriaId, formato, tempo } =
    (await req.json()) as Body

  if (!link) return Response.json({ error: 'Link da matéria ausente.' }, { status: 400 })
  if (!publico?.trim()) return Response.json({ error: 'Informe o público.' }, { status: 400 })
  if (!auditoriaId) return Response.json({ error: 'Selecione uma auditoria.' }, { status: 400 })
  if (formato !== 'carrossel' && formato !== 'video') {
    return Response.json({ error: 'Formato inválido.' }, { status: 400 })
  }
  if (formato === 'video' && !tempo) {
    return Response.json({ error: 'Informe o tempo do vídeo.' }, { status: 400 })
  }

  // 1. Ler a matéria (sem fallback — se bloquear, erro vai para a tela).
  let article: { text: string; url: string }
  try {
    article = await fetchArticleText(link)
  } catch (e) {
    const blocked = e instanceof Error && e.message === 'BLOCKED'
    return Response.json(
      {
        error: blocked
          ? 'Não foi possível ler a matéria: o site bloqueou o acesso ou exige login. Escolha outra pauta.'
          : 'Falha ao acessar a matéria. Tente novamente ou escolha outra pauta.',
      },
      { status: 502 }
    )
  }

  // 2. Carregar a auditoria selecionada + o contexto do produto.
  const [aud] = await sql`
    SELECT nome, prompt FROM auditoria WHERE id = ${auditoriaId}
  `
  if (!aud) return Response.json({ error: 'Auditoria não encontrada.' }, { status: 404 })

  const ctxRows = await sql`SELECT context_text FROM context WHERE tipo = 'ari' ORDER BY id LIMIT 1`
  const contextText =
    (ctxRows[0] as { context_text: string } | undefined)?.context_text?.trim() ?? ''

  const audit = aud as { nome: string; prompt: string }
  const isVideo = formato === 'video'

  // 3. Montar o prompt e chamar a Claude.
  const prompt = `Você é um roteirista de conteúdo para redes sociais.

Sua tarefa: a partir do MATERIAL abaixo (uma matéria real), escrever um ROTEIRO ${
    isVideo ? 'de vídeo' : 'de carrossel'
  }, seguindo OBRIGATORIAMENTE as diretrizes da AUDITORIA, pensando no PÚBLICO indicado${
    isVideo ? ` e respeitando a duração alvo de ${tempo} segundos` : ''
  }.

${contextText ? `## CONTEXTO DO PRODUTO\n${contextText}\n\n` : ''}## MATERIAL (matéria: "${newsTitle}")
${article.text}

## AUDITORIA — "${audit.nome}" (diretrizes obrigatórias do roteiro)
${audit.prompt}

## PÚBLICO
${publico}

## FORMATO
${
    isVideo
      ? `Vídeo — duração alvo: ${tempo} segundos. Escreva o roteiro em TEXTO CORRIDO — a narração/fala pronta para gravar, sem descrição de cenas e sem marcações de tempo ou câmera. Apenas o texto que será falado, em parágrafos, no tamanho que caiba nessa duração.`
      : 'Carrossel — estruture o roteiro em slides.'
  }

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

  return Response.json({ texto, source: article.url })
}
