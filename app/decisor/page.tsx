'use client';

import { useState, useRef } from 'react';
import WaitingText from '../components/WaitingText';

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

export default function Decisor() {
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

  // tela dividida — até 5 opções de vídeo por frase
  const [divididaVideos, setDivididaVideos] = useState<PexelsVideo[][]>([]);

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
              `/api/pexels?term=${encodeURIComponent(phrase.pexels_term)}&count=5`
            );
            const d = await r.json();
            return (d.videos as PexelsVideo[]) ?? [];
          } catch {
            return [];
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
    <div className="flex flex-col bg-primary">

      {/* Barra superior — input de vídeo, formato e transcrever.
          Enquanto carrega, ganha uma borda azul luminosa que gira ao redor. */}
      <div className={`mt-6 rounded-2xl ${status === 'loading' ? 'glow-border p-1' : ''}`}>
      <form
        onSubmit={handleSubmit}
        method="post"
        className="bg-second border border-txt/10 shadow-sm rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap"
      >
        {/* Input de vídeo */}
        <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-txt/15 bg-primary px-3 py-2 text-sm text-txt/70 hover:border-txt/40 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gold">
            <path d="m22 8-6 4 6 4V8Z" />
            <rect x="2" y="6" width="14" height="12" rx="2" />
          </svg>
          <span className="truncate max-w-48">{fileName || 'Escolher vídeo'}</span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            className="hidden"
          />
        </label>

        {/* Seletor de formato */}
        <div className="flex items-center gap-2 rounded-lg border border-txt/15 bg-primary px-3 py-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gold">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <select
            value={mode ?? ''}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="bg-transparent text-sm text-txt focus:outline-none cursor-pointer"
          >
            <option value="" disabled>
              Formato
            </option>
            <option value="tela_cheia">Tela Cheia</option>
            <option value="tela_dividida">Tela Dividida</option>
          </select>
        </div>

        {/* Botão transcrever */}
        <button
          type="submit"
          disabled={status === 'loading' || !mode}
          className="ml-auto flex items-center gap-2 py-2 px-5 rounded-lg bg-gold text-white text-sm font-semibold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          {status === 'loading' ? 'Processando…' : 'Transcrever'}
        </button>
      </form>
      </div>

      {/* Resultado */}
      <div className="flex flex-col gap-6 py-10">

        {status === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <WaitingText animateDots className="text-3xl font-bold text-sky-500" />
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
                  Opções de vídeo para cada frase
                </span>
                <div className="flex flex-col gap-3">
                  {phrases.map((phrase, i) => {
                    const options = divididaVideos[i] ?? [];
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-4 rounded-lg border border-txt/10 bg-second p-3"
                      >
                        {/* Frase (entre aspas) — esquerda */}
                        <div className="flex flex-col gap-1 w-1/3 shrink-0">
                          <span className="text-[10px] text-txt/40">
                            {formatTime(phrase.start)}
                          </span>
                          <p className="text-sm text-txt leading-relaxed">
                            “{phrase.text}”
                          </p>
                        </div>

                        {/* 5 opções de vídeo — direita */}
                        <div className="grid grid-cols-5 gap-2 flex-1 min-w-0">
                          {options.length > 0 ? (
                            options.map((video) => (
                              <a
                                key={video.id}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-video rounded-lg overflow-hidden border border-txt/10 bg-black"
                              >
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
                                <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-0.5 rounded leading-tight pointer-events-none">
                                  {video.duration}s
                                </span>
                              </a>
                            ))
                          ) : (
                            <span className="col-span-5 text-[10px] text-txt/40">
                              Sem vídeos encontrados.
                            </span>
                          )}
                        </div>
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
