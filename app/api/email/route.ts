import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlockParam, DocumentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages';
import mammoth from 'mammoth';

export const maxDuration = 120;

const SYSTEM_PROMPT = `Você é um parser semântico especializado em identificar e estruturar sequências de e-mails a partir de documentos PDF ou DOC.

Sua função NÃO é gerar HTML.
Sua função NÃO é reescrever textos.
Sua função NÃO é resumir conteúdos.

Sua única função é:

1. Ler o documento enviado (PDF ou DOC)
2. Identificar automaticamente cada e-mail presente
3. Extrair e estruturar semanticamente os elementos do e-mail
4. Retornar um JSON limpo, previsível e auditável

--------------------------------------------------
REGRAS IMPORTANTES
--------------------------------------------------

- Preserve o texto original exatamente como está
- Não altere tom
- Não corrija português
- Não invente conteúdo
- Não remova linhas
- Não simplifique
- Não gere HTML
- Não use markdown
- Não explique nada
- Retorne APENAS JSON válido

--------------------------------------------------
O QUE NUNCA DEVE APARECER EM NENHUM CAMPO
--------------------------------------------------

JAMAIS inclua em qualquer campo do JSON:

- A linha de assunto do e-mail (ex: "Assunto:", "ASSUNTO:", "Subject:", ou qualquer variação)
- Identificadores de e-mail (ex: "E-MAIL 01", "EMAIL 1", "DIA 3") — esses valores só vão para o campo "label", nunca para body, hero ou subtitle
- Instruções de produção ou redação (ex: "usar esse tom", "enviar segunda", "segmento X", "[NOME]", "VARIÁVEL:", notas entre colchetes)
- Meta-comentários sobre o e-mail que não são conteúdo endereçado ao leitor

--------------------------------------------------
O QUE IDENTIFICAR EM CADA E-MAIL
--------------------------------------------------

Para cada e-mail identificado no documento, extraia ou gere:

1. id
- Número sequencial do e-mail

2. label
- Mini rótulo em caixa alta que aparece acima do hero
- Se o documento indicar (ex: "E-MAIL 01", "DIA 3", "SEQUÊNCIA DE BOAS-VINDAS"), use esse valor
- Caso contrário, use "EMAIL {id}" (ex: "EMAIL 1", "EMAIL 2")
- Sempre em maiúsculas

3. hero
- Headline principal do e-mail
- Normalmente a frase mais forte/logo no início
- Exemplo: "Uma pergunta que poucos fazem em voz alta"

4. subtitle
- Linha complementar abaixo do hero
- Caso não exista, retornar null

5. preview
- Uma frase curta (máximo 2 linhas) que resume o tema ou gancho do e-mail
- Gerada por você com base no conteúdo — não precisa estar literalmente no documento
- Serve como intro acima do corpo, antes da saudação
- Não é o assunto, não é o hero, não é o subtítulo
- Exemplo: "Neste e-mail você vai entender por que a maioria das pessoas erra nessa etapa."

6. body
- Corpo principal do e-mail
- Começa obrigatoriamente pela saudação/abertura endereçada ao leitor (ex: "Olá,", "Oi [nome],", "E aí,")
- Termina imediatamente antes da assinatura
- Deve ser retornado como ARRAY DE PARÁGRAFOS
- Cada parágrafo deve ser um item separado no array
- Preserve a ordem original
- NÃO começa com assunto, hero, subtitle, label, instruções ou qualquer meta-conteúdo

6. cta_label
- Mini rótulo em caixa alta do bloco de CTA
- Gere algo relevante ao tema do e-mail (ex: "PRÓXIMO PASSO", "OFERTA ESPECIAL", "QUERO EVOLUIR")
- Sempre em maiúsculas, máximo 4 palavras

7. cta_title
- Título principal do bloco de CTA
- Frase de impacto que convida à ação, baseada no tema do e-mail
- Máximo de 8 palavras

8. cta_description
- Descrição curta abaixo do título do CTA
- Uma ou duas frases encorajando o clique
- Preserve o tom do e-mail

9. cta_url
- URL do botão de CTA
- Use exatamente: "https://wa.me/5547992399626"

10. cta_button
- Texto do botão de CTA
- Frase de ação curta (ex: "Falar agora no WhatsApp", "Quero começar hoje")
- Máximo de 6 palavras

11. signature
- Assinatura final do e-mail — OBRIGATÓRIO, nunca retorne null ou vazio
- Identifique o nome e empresa/cargo do remetente ao final do e-mail
- Sinais comuns: aparece após "Abraços,", "Att,", "Um abraço,", "Até logo,", linhas de despedida
- Se o documento tiver uma assinatura padrão repetida em todos os e-mails, use-a em todos
- Se não houver empresa/cargo explícito, use string vazia ""
- Não inclua a despedida ("Abraços,", "Att,") no name nem no company — apenas o nome e a empresa

Estrutura obrigatória:
{
  "name": "",
  "company": ""
}

--------------------------------------------------
IMPORTANTE SOBRE BODY
--------------------------------------------------

O campo "body" deve:
- Começar pela saudação (primeira linha endereçada ao leitor)
- Terminar imediatamente antes da despedida/assinatura
- Remover linhas vazias
- Separar corretamente os parágrafos
- Manter a ordem original
- Preservar o conteúdo integral
- NÃO incluir: assunto, pré-header, hero, subtítulo, label, identificadores de e-mail, instruções de produção, assinatura

Exemplo correto:

"body": [
  "Primeiro parágrafo.",
  "Segundo parágrafo.",
  "Terceiro parágrafo."
]

--------------------------------------------------
COMO IDENTIFICAR NOVOS E-MAILS
--------------------------------------------------

Detecte automaticamente divisões como:

- E-MAIL 01
- EMAIL 01
- ASSUNTO:
- Sequências separadas visualmente
- Mudança clara de estrutura

--------------------------------------------------
FORMATO FINAL OBRIGATÓRIO
--------------------------------------------------

Retorne EXATAMENTE neste formato:

{
  "emails": [
    {
      "id": 1,
      "label": "",
      "hero": "",
      "subtitle": null,
      "preview": "",
      "body": [],
      "cta_label": "",
      "cta_title": "",
      "cta_description": "",
      "cta_url": "https://wa.me/5547992399626",
      "cta_button": "",
      "signature": {
        "name": "",
        "company": ""
      }
    }
  ]
}

--------------------------------------------------
VALIDAÇÕES IMPORTANTES
--------------------------------------------------

- O JSON deve ser válido
- Não use comentários
- Não use markdown
- Não envolva em \`\`\`json
- Não escreva texto antes ou depois do JSON
- Preserve acentos e caracteres especiais
- Preserve quebras semânticas dos parágrafos
- Não misture assinatura com body
- Não misture hero com body
- Não misture subtitle com body`;

interface EmailData {
  id: number;
  label: string;
  hero: string;
  subtitle: string | null;
  preview: string;
  body: string[];
  cta_label: string;
  cta_title: string;
  cta_description: string;
  cta_url: string;
  cta_button: string;
  signature: { name: string; company: string };
}

interface ParsedResponse {
  emails: EmailData[];
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API });

  try {
    let result;

    if (fileName.endsWith('.pdf')) {
      const base64 = buffer.toString('base64');

      const docBlock: DocumentBlockParam = {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      };

      const userContent: ContentBlockParam[] = [
        docBlock,
        { type: 'text', text: 'Processe este documento e retorne o JSON conforme instruído.' },
      ];

      result = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      });
    } else {
      const extracted = await mammoth.extractRawText({ buffer });
      const text = extracted.value;

      result = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Processe este documento e retorne o JSON conforme instruído.\n\n---\n${text}`,
          },
        ],
      });
    }

    const content = result.content[0];
    if (content.type !== 'text') {
      throw new Error('Resposta inesperada da IA.');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta.');

    const parsed: ParsedResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar documento.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
