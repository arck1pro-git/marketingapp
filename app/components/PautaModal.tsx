'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import WaitingText from './WaitingText'

interface Audit {
  id: number
  nome: string
}

interface Props {
  newsTitle: string
  newsLink: string
  onClose: () => void
}

type Formato = 'carrossel' | 'video'
type ModalState = 'form' | 'generating' | 'preview' | 'saving' | 'saved'

export default function PautaModal({ newsTitle, newsLink, onClose }: Props) {
  const router = useRouter()
  const [modalState, setModalState] = useState<ModalState>('form')
  const [audits, setAudits] = useState<Audit[]>([])
  const [publico, setPublico] = useState('')
  const [auditoriaId, setAuditoriaId] = useState<number | ''>('')
  const [formato, setFormato] = useState<Formato>('carrossel')
  const [tempo, setTempo] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [roteiro, setRoteiro] = useState('')

  useEffect(() => {
    fetch('/api/auditorias')
      .then((r) => r.json())
      .then((data: Audit[]) => {
        setAudits(data)
        if (data.length > 0) setAuditoriaId(data[0].id)
      })
      .catch(() => setAudits([]))
  }, [])

  const isVideo = formato === 'video'
  const busy = modalState === 'generating' || modalState === 'saving'

  async function handleGenerate() {
    if (!publico.trim()) return setError('Informe o público.')
    if (!auditoriaId) return setError('Selecione uma auditoria.')

    setModalState('generating')
    setError(null)
    try {
      const res = await fetch('/api/roteiros/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: newsLink,
          newsTitle,
          publico,
          auditoriaId,
          formato,
          tempo: isVideo ? tempo : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar o roteiro.')
      setRoteiro(data.texto)
      setModalState('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
      setModalState('form')
    }
  }

  async function handleSave() {
    setModalState('saving')
    setError(null)
    try {
      const res = await fetch('/api/roteiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newsTitle, texto: roteiro, tipo: formato }),
      })
      if (!res.ok) throw new Error('Erro ao salvar o roteiro.')
      setModalState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      setModalState('preview')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="w-full sm:max-w-2xl bg-primary border border-txt/10 shadow-2xl rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-txt/50 uppercase tracking-widest font-medium mb-1">
              {modalState === 'saved' ? 'Roteiro salvo' : 'Gerar roteiro'}
            </p>
            <p className="text-txt font-semibold text-sm leading-snug line-clamp-2">{newsTitle}</p>
          </div>
          {!busy && (
            <button
              onClick={onClose}
              className="shrink-0 text-txt/50 hover:text-txt transition-colors"
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* FORM */}
        {(modalState === 'form' || modalState === 'generating') && (
          <>
            {/* Público */}
            <div className="flex flex-col gap-2">
              <label htmlFor="publico" className="text-xs text-txt/60 font-medium">Público</label>
              <textarea
                id="publico"
                value={publico}
                onChange={(e) => setPublico(e.target.value)}
                disabled={busy}
                rows={2}
                placeholder="Para quem é esse roteiro? Ex.: investidores iniciantes interessados em renda passiva no litoral de SC..."
                className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 resize-none disabled:opacity-50"
              />
            </div>

            {/* Auditoria */}
            <div className="flex flex-col gap-2">
              <label htmlFor="auditoria" className="text-xs text-txt/60 font-medium">Auditoria</label>
              {audits.length === 0 ? (
                <p className="text-xs text-txt/50">
                  Nenhuma auditoria cadastrada. Crie uma em <span className="text-gold">Auditorias</span> antes de gerar.
                </p>
              ) : (
                <select
                  id="auditoria"
                  value={auditoriaId}
                  onChange={(e) => setAuditoriaId(Number(e.target.value))}
                  disabled={busy}
                  className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt focus:outline-none focus:border-txt/40 disabled:opacity-50"
                >
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Formato */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-txt/60 font-medium">Formato</p>
              <div className="flex gap-2">
                {(['carrossel', 'video'] as Formato[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormato(f)}
                    disabled={busy}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      formato === f
                        ? 'bg-gold text-white border-gold'
                        : 'border-txt/15 text-txt/60 hover:border-txt/40 hover:text-txt'
                    } disabled:opacity-50`}
                  >
                    {f === 'carrossel' ? 'Carrossel' : 'Vídeo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo (só vídeo) */}
            {isVideo && (
              <div className="flex flex-col gap-2">
                <label htmlFor="tempo" className="text-xs text-txt/60 font-medium">
                  Tempo do vídeo (segundos)
                </label>
                <input
                  id="tempo"
                  type="number"
                  min={5}
                  step={5}
                  value={tempo}
                  onChange={(e) => setTempo(Math.max(5, Number(e.target.value) || 0))}
                  disabled={busy}
                  className="w-32 bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt focus:outline-none focus:border-txt/40 disabled:opacity-50"
                />
              </div>
            )}

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              onClick={handleGenerate}
              disabled={busy || audits.length === 0}
              className="w-full py-3 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modalState === 'generating' ? 'Lendo matéria e gerando…' : 'Gerar roteiro'}
            </button>
            {modalState === 'generating' && (
              <p className="text-xs text-txt/50 text-center -mt-2">
                <WaitingText className="font-medium text-txt/70" /> lendo a matéria no
                site original. Pode levar alguns segundos.
              </p>
            )}
          </>
        )}

        {/* PREVIEW */}
        {(modalState === 'preview' || modalState === 'saving') && (
          <>
            <div className="bg-second border border-txt/10 rounded-xl p-4 max-h-[50vh] overflow-y-auto">
              <p className="text-sm text-txt leading-relaxed whitespace-pre-wrap">{roteiro}</p>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setModalState('form'); setError(null) }}
                disabled={modalState === 'saving'}
                className="flex-1 py-3 rounded-full border border-txt/15 text-txt/60 font-semibold text-sm hover:border-txt/40 hover:text-txt transition-colors disabled:opacity-50"
              >
                Refazer
              </button>
              <button
                onClick={handleSave}
                disabled={modalState === 'saving'}
                className="flex-1 py-3 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalState === 'saving' ? 'Salvando…' : 'Salvar roteiro'}
              </button>
            </div>
          </>
        )}

        {/* SAVED */}
        {modalState === 'saved' && (
          <>
            <p className="text-txt/60 text-sm">O roteiro foi salvo e está disponível em Roteiros.</p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full border border-txt/15 text-txt/60 font-semibold text-sm hover:border-txt/40 hover:text-txt transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => router.push('/roteiros')}
                className="flex-1 py-3 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors"
              >
                Ver roteiros
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
