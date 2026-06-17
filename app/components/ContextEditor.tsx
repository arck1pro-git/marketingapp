'use client'

import { useEffect, useRef, useState } from 'react'

type Tipo = 'ari' | 'fabricio'
type Status = 'idle' | 'saving' | 'saved' | 'error'

const META: { tipo: Tipo; label: string; placeholder: string }[] = [
  {
    tipo: 'ari',
    label: 'Contexto Ari',
    placeholder:
      'Ex: Ari é um ativo de renda imobiliário — produto para investir na incorporação em Porto Belo (SC). Público, tom de voz...',
  },
  {
    tipo: 'fabricio',
    label: 'Contexto Fabrício',
    placeholder:
      'Ex: Fabrício — marca pessoal, posicionamento, público e tom de voz para os conteúdos...',
  },
]

export default function ContextEditor() {
  const [loading, setLoading] = useState(true)
  const [texts, setTexts] = useState<Record<Tipo, string>>({ ari: '', fabricio: '' })
  const [status, setStatus] = useState<Record<Tipo, Status>>({ ari: 'idle', fabricio: 'idle' })
  const timers = useRef<Record<Tipo, ReturnType<typeof setTimeout> | null>>({
    ari: null,
    fabricio: null,
  })

  useEffect(() => {
    fetch('/api/context')
      .then((r) => r.json())
      .then((d: Record<Tipo, string>) => {
        setTexts({ ari: d.ari ?? '', fabricio: d.fabricio ?? '' })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save(tipo: Tipo) {
    setStatus((s) => ({ ...s, [tipo]: 'saving' }))
    try {
      const res = await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, context_text: texts[tipo] }),
      })
      if (!res.ok) throw new Error()
      setStatus((s) => ({ ...s, [tipo]: 'saved' }))
      if (timers.current[tipo]) clearTimeout(timers.current[tipo]!)
      timers.current[tipo] = setTimeout(
        () => setStatus((s) => ({ ...s, [tipo]: 'idle' })),
        2500
      )
    } catch {
      setStatus((s) => ({ ...s, [tipo]: 'error' }))
    }
  }

  return (
    <div className="flex flex-col gap-8 px-10 py-10 w-full max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-txt tracking-tight">Contexto</h1>
        <p className="text-txt/60 text-sm">
          Dois contextos enviados à IA na geração de conteúdo: o do produto (Ari) e o do Fabrício.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {META.map(({ tipo, label, placeholder }) => {
          const st = status[tipo]
          const busy = loading || st === 'saving'
          return (
            <div
              key={tipo}
              className="bg-second border border-txt/10 shadow-sm rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-gold" />
                <h2 className="text-sm font-semibold text-txt">{label}</h2>
              </div>

              <textarea
                value={texts[tipo]}
                onChange={(e) => setTexts((t) => ({ ...t, [tipo]: e.target.value }))}
                disabled={busy}
                placeholder={placeholder}
                className="w-full min-h-72 resize-y rounded-xl bg-primary border border-txt/15 text-txt text-sm leading-relaxed px-4 py-3 placeholder:text-txt/40 focus:outline-none focus:border-txt/40 transition-colors disabled:opacity-50"
              />

              <div className="flex items-center justify-between">
                <span className="text-txt/50 text-xs">{texts[tipo].length} caracteres</span>
                <button
                  onClick={() => save(tipo)}
                  disabled={busy}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    st === 'saved'
                      ? 'bg-green-600 text-primary'
                      : 'bg-gold text-txt hover:bg-gold/90'
                  }`}
                >
                  {loading
                    ? 'Carregando…'
                    : st === 'saving'
                    ? 'Salvando…'
                    : st === 'saved'
                    ? 'Salvo!'
                    : 'Salvar'}
                </button>
              </div>

              {st === 'error' && (
                <p className="text-red-600 text-xs">Erro ao salvar. Tente novamente.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
