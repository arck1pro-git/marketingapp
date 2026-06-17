import { NextRequest, NextResponse } from 'next/server';
import { createTranscription } from '@/app/lib/create_transcription';
import { analyzeTranscription } from '@/app/lib/analyze_transcription';
import { analyzeTranscriptionTelaDividida } from '@/app/lib/claude_teladividida';

export const maxDuration = 360;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const mode = (formData.get('mode') as string | null) ?? 'tela_cheia';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const transcription = await createTranscription(buffer, file.name);

    const lastSegment = transcription.segments[transcription.segments.length - 1];
    const duration = lastSegment?.end ?? 0;

    if (mode === 'tela_dividida') {
      const phrases = await analyzeTranscriptionTelaDividida(transcription.segments);
      return NextResponse.json({ transcription, phrases, duration });
    }

    const phrases = await analyzeTranscription(transcription.segments);
    return NextResponse.json({ transcription, phrases, duration });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
