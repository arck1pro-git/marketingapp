// Transcrição via API do Groq (modelos Whisper da OpenAI hospedados no Groq).
// Endpoint compatível com a OpenAI: /openai/v1/audio/transcriptions
const GROQ_TRANSCRIBE_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3'

interface Segment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  language: string
  language_probability: number
  duration?: number
  full_text?: string
  segments: Segment[]
}

// Formato verbose_json retornado pelo Whisper (Groq/OpenAI)
interface WhisperVerboseResponse {
  language?: string
  duration?: number
  text?: string
  segments?: { start: number; end: number; text: string }[]
}

export async function createTranscription(
  fileBuffer: Buffer,
  fileName: string
): Promise<TranscriptionResult> {
  if (!process.env.GROQ_API) {
    throw new Error('GROQ_API não definida. Configure-a no arquivo .env')
  }

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(fileBuffer)])
  formData.append('file', blob, fileName)
  formData.append('model', GROQ_WHISPER_MODEL)
  formData.append('response_format', 'verbose_json')

  const response = await fetch(GROQ_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API}` },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error ${response.status}: ${error}`)
  }

  const data = (await response.json()) as WhisperVerboseResponse

  const segments: Segment[] = (data.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }))

  return {
    language: data.language ?? 'unknown',
    language_probability: 1,
    duration: data.duration,
    full_text: data.text?.trim(),
    segments,
  }
}
