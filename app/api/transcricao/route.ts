import { NextRequest, NextResponse } from 'next/server';
import { createTranscription } from '@/app/lib/create_transcription';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const transcription = await createTranscription(buffer, file.name);

    const lastSegment = transcription.segments[transcription.segments.length - 1];
    const duration = transcription.duration ?? lastSegment?.end ?? 0;
    const fullText =
      transcription.full_text ??
      transcription.segments.map((s) => s.text).join(' ').trim();

    return NextResponse.json({
      language: transcription.language,
      duration,
      full_text: fullText,
      segments: transcription.segments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha na transcrição.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
