import Anthropic from '@anthropic-ai/sdk';

const CONTENT_CONTEXT = 'marketing e vendas de produtos e serviços';

interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface TelaDivididaPhrase {
  start: number;
  end: number;
  text: string;
  pexels_term: string;
}

export async function analyzeTranscriptionTelaDividida(
  segments: Segment[]
): Promise<TelaDivididaPhrase[]> {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API });

  const fullText = segments
    .map((s) => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] ${s.text}`)
    .join('\n');

  const prompt = `Você é um editor de vídeo criativo especializado em ${CONTENT_CONTEXT}.

Analise a transcrição abaixo. Para CADA segmento, sugira um termo de busca em inglês para encontrar um vídeo B-roll que complemente visualmente o que está sendo dito.

O termo NÃO precisa ser literal — pode ser associativo, metafórico ou criativo. Exemplos:
- "crescimento" → "tree growing time lapse"
- "jogador" → "basketball player dribbling"
- "conquista" → "person reaching mountain summit"
- Se o contexto for abstrato, sugira uma imagem visual que transmita a mesma emoção ou ideia

Transcrição:
${fullText}

Responda SOMENTE com um array JSON válido, sem texto adicional, com um objeto para CADA segmento na mesma ordem:
[
  {
    "start": <número float em segundos>,
    "end": <número float em segundos>,
    "text": "<texto exato do segmento>",
    "pexels_term": "<termo criativo em inglês para busca de vídeo>"
  }
]`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in Claude response');

  return JSON.parse(jsonMatch[0]) as TelaDivididaPhrase[];
}
