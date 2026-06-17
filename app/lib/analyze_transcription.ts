import Anthropic from '@anthropic-ai/sdk';

const CONTENT_CONTEXT = 'marketing e vendas de produtos e serviços';

interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface PhraseResult {
  start: number;
  end: number;
  text: string;
  pexels_term: string;
}

export async function analyzeTranscription(
  segments: Segment[]
): Promise<PhraseResult[]> {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API });

  const fullText = segments
    .map((s) => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] ${s.text}`)
    .join('\n');

  const prompt = `Você é um especialista em copywriting e marketing de conteúdo com foco em ${CONTENT_CONTEXT}.

Analise a transcrição abaixo e selecione entre 10 e 15 frases que:
- Gerem atenção imediata
- Ajudem na conversão do público
- Sejam relevantes para o contexto de ${CONTENT_CONTEXT}

Para cada frase selecionada, forneça também um termo de busca em inglês para encontrar um vídeo B-roll complementar no Pexels.

Transcrição:
${fullText}

Responda SOMENTE com um array JSON válido, sem texto adicional, no seguinte formato:
[
  {
    "start": <número float do timestamp de início em segundos>,
    "end": <número float do timestamp de fim em segundos>,
    "text": "<frase exata da transcrição>",
    "pexels_term": "<termo em inglês para busca de vídeo>"
  }
]`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in Claude response');

  return JSON.parse(jsonMatch[0]) as PhraseResult[];
}
