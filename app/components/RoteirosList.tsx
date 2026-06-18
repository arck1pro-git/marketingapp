'use client'

import { useEffect, useState } from 'react'

interface Roteiro {
  id: number
  nome: string
  texto: string
  tipo: string | null
  created_at: string
}

const TIPO_LABEL: Record<string, string> = { carrossel: 'Carrossel', video: 'Vídeo' }

type Mode = { kind: 'idle' } | { kind: 'edit'; id: number }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function RoteirosList() {
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<'carrossel' | 'video'>('carrossel')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/roteiros')
      if (res.ok) setRoteiros(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(r: Roteiro) {
    setMode({ kind: 'edit', id: r.id })
    setNome(r.nome)
    setTexto(r.texto)
    setTipo(r.tipo === 'video' ? 'video' : 'carrossel')
    setError(null)
  }

  function cancel() {
    setMode({ kind: 'idle' })
    setNome('')
    setTexto('')
    setError(null)
  }

  async function save() {
    if (mode.kind !== 'edit') return
    if (!nome.trim() || !texto.trim()) {
      setError('Preencha o nome e o texto do roteiro.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/roteiros/${mode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, texto, tipo }),
      })
      if (!res.ok) throw new Error('Erro ao salvar o roteiro.')
      await load()
      cancel()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
    } finally {
      setSaving(false)
    }
  }

  async function copy(r: Roteiro) {
    await navigator.clipboard.writeText(r.texto)
    setCopiedId(r.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function remove(id: number) {
    if (!confirm('Excluir este roteiro? Essa ação não pode ser desfeita.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/roteiros/${id}`, { method: 'DELETE' })
      setRoteiros((prev) => prev.filter((r) => r.id !== id))
      if (mode.kind === 'edit' && mode.id === id) cancel()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-primary text-txt flex flex-col px-6 py-16 gap-8">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Roteiros</h1>
          <p className="text-txt/60 text-sm">Roteiros gerados a partir das pautas.</p>
        </div>

        {/* Editor */}
        {mode.kind === 'edit' && (
          <div className="bg-second border border-txt/10 shadow-sm rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-sm font-semibold text-txt">Editar roteiro</p>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-txt/60 font-medium">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={saving}
                className="w-full bg-primary border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-txt/60 font-medium">Texto</label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={saving}
                rows={14}
                className="w-full min-h-72 resize-y bg-primary border border-txt/15 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={cancel}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full border border-txt/15 text-txt/60 font-semibold text-sm hover:border-txt/40 hover:text-txt transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-second rounded-xl p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : roteiros.length === 0 ? (
          <p className="text-txt/50 text-sm">
            Nenhum roteiro salvo ainda. Gere um a partir de uma pauta em Material.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {roteiros.map((r) => {
              const open = openId === r.id
              return (
                <div
                  key={r.id}
                  className="bg-second border border-txt/10 shadow-sm rounded-xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {r.tipo && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gold border border-gold/40 rounded px-1.5 py-0.5">
                            {TIPO_LABEL[r.tipo] ?? r.tipo}
                          </span>
                        )}
                        <p className="text-txt font-semibold text-sm leading-snug truncate">{r.nome}</p>
                      </div>
                      <p className="text-txt/50 text-xs">{formatDate(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setOpenId(open ? null : r.id)}
                        className="text-txt/60 hover:text-txt transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                      >
                        {open ? 'Recolher' : 'Ver'}
                      </button>
                      <button
                        onClick={() => startEdit(r)}
                        className="text-txt/60 hover:text-gold transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => copy(r)}
                        className="text-txt/60 hover:text-txt transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                      >
                        {copiedId === r.id ? 'Copiado!' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        disabled={deletingId === r.id}
                        className="text-txt/50 hover:text-red-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5 disabled:opacity-40"
                      >
                        {deletingId === r.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="bg-primary border border-txt/10 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                      <p className="text-sm text-txt leading-relaxed whitespace-pre-wrap">
                        {r.texto}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
