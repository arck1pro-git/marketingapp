'use client';

import { useRef, useState } from 'react';

type Status = 'idle' | 'loading' | 'done' | 'error';

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResponse {
  language: string;
  duration: number;
  full_text: string;
  segments: Segment[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function TranscricaoPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus('loading');
    setError('');
    setResult(null);
    setCopied(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/transcricao', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro desconhecido.');
        setStatus('error');
        return;
      }

      setResult(data as TranscriptionResponse);
      setStatus('done');
    } catch {
      setError('Não foi possível conectar ao servidor.');
      setStatus('error');
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.full_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Painel de envio */}
      <div className="w-full px-10 pt-10">
        <div className="bg-second border border-txt/5 shadow-sm rounded-2xl p-7 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-txt">
              Transcrever Vídeo
            </h1>
            <p className="text-sm text-txt/60">
              Envie um vídeo (ou áudio) e receba a transcrição completa pronta para copiar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-txt">
                Vídeo ou áudio
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="video/*,audio/*"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                className="block w-full text-sm text-txt/60
                  file:mr-3 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-txt file:text-primary
                  file:cursor-pointer cursor-pointer
                  border border-txt/15
                  rounded-md bg-primary px-1 py-1"
              />
            </label>

            {fileName && (
              <p className="text-xs text-txt/60">
                Selecionado: <span className="font-medium">{fileName}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-2.5 px-4 rounded-md bg-gold text-white text-sm font-semibold
                hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'loading' ? 'Transcrevendo…' : 'Transcrever'}
            </button>
          </form>
        </div>
      </div>

      {/* Resultado */}
      <div className="flex-1 px-10 py-8 flex flex-col gap-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 text-txt/60">
            <Spinner />
            <p className="text-sm">
              Transcrevendo o vídeo. Isso pode levar alguns minutos…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {status === 'done' && result && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-txt">
                Transcrição
                <span className="ml-2 text-xs font-normal text-txt/50 uppercase">
                  {result.language}
                </span>
                {result.duration > 0 && (
                  <span className="ml-2 text-xs font-normal text-txt/50">
                    {formatTime(result.duration)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-txt text-primary text-sm font-medium hover:bg-txt/85 transition-colors border border-txt"
              >
                {copied ? (
                  <>
                    <CheckIcon />
                    Copiado!
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    Copiar transcrição
                  </>
                )}
              </button>
            </div>

            <div className="w-full max-h-[70vh] overflow-y-auto overscroll-contain
              bg-second border border-txt/10
              rounded-lg shadow-inner py-4 px-5">
              <p className="text-sm leading-relaxed text-txt whitespace-pre-wrap">
                {result.full_text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6 text-txt/50"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
