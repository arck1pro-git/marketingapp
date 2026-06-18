'use client';

import { useState, useRef } from 'react';
import WaitingText from './components/WaitingText';

type Mode = 'tela_cheia' | 'tela_dividida';
type Status = 'idle' | 'loading' | 'done' | 'error';

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  language: string;
  language_probability: number;
  segments: Segment[];
}

interface PhraseResult {
  start: number;
  end: number;
  text: string;
  pexels_term: string;
}

interface PexelsVideo {
  id: number;
  duration: number;
  thumbnail: string;
  url: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<Mode | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [phrases, setPhrases] = useState<PhraseResult[]>([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // tela cheia
  const [activePhrase, setActivePhrase] = useState<number | null>(null);
  const [videosCache, setVideosCache] = useState<Record<number, PexelsVideo[]>>({});
  const [loadingVideos, setLoadingVideos] = useState<number | null>(null);

  // tela dividida
  const [divididaVideos, setDivididaVideos] = useState<(PexelsVideo | null)[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file || !mode) return;

    setStatus('loading');
    setTranscription(null);
    setPhrases([]);
    setDuration(0);
    setError('');
    setActivePhrase(null);
    setVideosCache({});
    setDivididaVideos([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Unknown error');
      setStatus('error');
      return;
    }

    const resultPhrases: PhraseResult[] = data.phrases ?? [];
    setTranscription(data.transcription);
    setPhrases(resultPhrases);
    setDuration(data.duration ?? 0);
    setStatus('done');

    if (mode === 'tela_dividida' && resultPhrases.length > 0) {
      const videos = await Promise.all(
        resultPhrases.map(async (phrase) => {
          try {
            const r = await fetch(
              `/api/pexels?term=${encodeURIComponent(phrase.pexels_term)}&count=1`
            );
            const d = await r.json();
            return (d.videos?.[0] as PexelsVideo) ?? null;
          } catch {
            return null;
          }
        })
      );
      setDivididaVideos(videos);
    }
  }

  async function handleMarkerClick(index: number) {
    if (activePhrase === index) {
      setActivePhrase(null);
      return;
    }
    setActivePhrase(index);
    if (videosCache[index]) return;

    const phrase = phrases[index];
    setLoadingVideos(index);
    try {
      const res = await fetch(`/api/pexels?term=${encodeURIComponent(phrase.pexels_term)}`);
      const data = await res.json();
      setVideosCache((prev) => ({ ...prev, [index]: data.videos ?? [] }));
    } finally {
      setLoadingVideos(null);
    }
  }

  return (
    <div className="h-auto flex flex-row-reverse bg-primary">

      {/* Formulário — lateral direita */}
      <div className="w-1/3 shrink-0">
        <div className="bg-second border border-txt/5 shadow-sm h-auto rounded-2xl m-10 p-7 flex flex-col gap-6 sticky top-20">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-txt">
              De vídeo para decisão
            </h1>
            <p className="text-sm text-txt/60">
              transcreva seu vídeo e tenha decidido o material de apoio pra ele
            </p>
          </div>

          <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-txt">
                Mande seu vídeo
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,video/*"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                className="block w-full text-sm text-txt/60
                  file:mr-3 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-txt file:text-primary
                  file:cursor-pointer
                  cursor-pointer
                  border border-txt/15
                  rounded-md bg-primary
                  px-1 py-1"
              />
            </label>

            {fileName && (
              <p className="text-xs text-txt/60">
                Selecionado: <span className="font-medium">{fileName}</span>
              </p>
            )}

            <div className="flex gap-3">
              {(['tela_cheia', 'tela_dividida'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors
                    ${mode === m
                      ? 'bg-gold text-white border-gold'
                      : 'bg-primary text-txt/70 border-txt/15 hover:border-txt/40'
                    }`}
                >
                  {m === 'tela_cheia' ? 'Tela Cheia' : 'Tela Dividida'}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !mode}
              className="w-full py-2.5 px-4 rounded-md bg-gold text-white text-sm font-semibold
                hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
            >
              {status === 'loading' ? 'Processando…' : 'Transcrever'}
            </button>
          </form>
        </div>
      </div>

      {/* Resultado — lateral esquerda */}
      <div className="w-2/3 flex flex-col gap-6 p-10">

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 text-txt/60">
            <Spinner />
            <WaitingText className="text-sm font-medium text-txt" />
            <p className="text-xs text-txt/50">
              Transcrevendo e analisando o vídeo. Isso pode levar até 3 minutos.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Tela Cheia ── */}
        {status === 'done' && transcription && mode === 'tela_cheia' && (
          <>
            {phrases.length > 0 && duration > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-txt">
                  Pontos de Atenção
                </span>
                <div className="relative h-3 bg-txt/10 rounded-full">
                  {phrases.map((phrase, i) => {
                    const pct = (phrase.start / duration) * 100;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleMarkerClick(i)}
                        title={phrase.text}
                        style={{ left: `${pct}%` }}
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                          w-3.5 h-3.5 rounded-full border-2 transition-colors
                          ${activePhrase === i
                            ? 'bg-gold border-gold'
                            : 'bg-primary border-txt/40 hover:border-txt'
                          }`}
                      />
                    );
                  })}
                </div>

                {activePhrase !== null && (
                  <div className="rounded-lg border border-txt/10 bg-second p-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-txt/50">
                        {formatTime(phrases[activePhrase].start)}
                      </span>
                      <p className="text-sm text-txt leading-relaxed">
                        {phrases[activePhrase].text}
                      </p>
                      <span className="text-xs text-txt/50">
                        Vídeos: <em>{phrases[activePhrase].pexels_term}</em>
                      </span>
                    </div>

                    {loadingVideos === activePhrase && (
                      <div className="flex items-center gap-2 text-xs text-txt/50">
                        <Spinner small />
                        Buscando vídeos…
                      </div>
                    )}

                    {videosCache[activePhrase] && (
                      <div className="grid grid-cols-5 gap-2">
                        {videosCache[activePhrase].map((video) => (
                          <a
                            key={video.id}
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-video rounded overflow-hidden border border-txt/10"
                          >
                            <img
                              src={video.thumbnail}
                              alt=""
                              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                            />
                            <span className="absolute bottom-0.5 right-0.5 text-[10px] bg-black/60 text-white px-1 rounded">
                              {video.duration}s
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-txt">
                  Transcrição
                  <span className="ml-2 text-xs font-normal text-txt/50 uppercase">
                    {transcription.language}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      transcription.segments.map((s) => s.text).join(' ')
                    )
                  }
                  className="text-xs text-txt/60 hover:text-txt transition-colors"
                >
                  Copiar
                </button>
              </div>
              <div className="w-full flex flex-col gap-1 max-h-[60vh] overflow-y-auto overscroll-contain
                pr-2 bg-second border border-txt/10
                rounded-lg shadow-inner py-3 px-4">
                {transcription.segments.map((seg, i) => (
                  <div key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="shrink-0 text-xs text-txt/50 mt-0.5 w-10">
                      {formatTime(seg.start)}
                    </span>
                    <p className="text-txt">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Tela Dividida ── */}
        {status === 'done' && transcription && mode === 'tela_dividida' && (
          <>
            {divididaVideos.length === 0 && phrases.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-txt/50 py-4">
                <Spinner small />
                Buscando vídeos…
              </div>
            )}

            {divididaVideos.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-txt">
                  Vídeos escolhidos para os {divididaVideos.length} segmentos
                </span>
                <div
                  className="grid gap-4 w-full"
                  style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
                >
                  {phrases.map((phrase, i) => {
                    const video = divididaVideos[i];
                    return (
                      <div key={i} className="flex flex-col gap-1.5">
                        {video ? (
                          <div className="group relative aspect-video rounded-lg overflow-hidden border border-txt/10 cursor-pointer bg-black">
                            <img
                              src={video.thumbnail}
                              alt={phrase.pexels_term}
                              className="w-full h-full object-cover group-hover:hidden transition-opacity"
                            />
                            <video
                              src={video.url}
                              className="hidden group-hover:block w-full h-full object-cover"
                              autoPlay
                              muted
                              loop
                            />
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0"
                            />
                            <span className="absolute top-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded leading-tight pointer-events-none">
                              {formatTime(phrase.start)}
                            </span>
                            <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-0.5 rounded leading-tight pointer-events-none">
                              {video.duration}s
                            </span>
                          </div>
                        ) : (
                          <div className="aspect-video rounded-lg border border-txt/10 bg-second flex items-center justify-center">
                            <span className="text-[10px] text-txt/40">—</span>
                          </div>
                        )}
                        <p className="text-[10px] text-txt/60 leading-tight line-clamp-3">
                          {phrase.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const size = small ? 'h-3.5 w-3.5' : 'h-6 w-6';
  return (
    <svg
      className={`animate-spin ${size} text-txt/50`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
