'use client'

import { useEffect, useState } from 'react'

interface Audit {
  id: number
  nome: string
  prompt: string
  created_at: string
}

type Mode = { kind: 'idle' } | { kind: 'new' } | { kind: 'edit'; id: number }

export default function AuditoriasManager() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [nome, setNome] = useState('')
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/auditorias')
      if (res.ok) setAudits(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startNew() {
    setMode({ kind: 'new' })
    setNome('')
    setPrompt('')
    setError(null)
  }

  function startEdit(a: Audit) {
    setMode({ kind: 'edit', id: a.id })
    setNome(a.nome)
    setPrompt(a.prompt)
    setError(null)
  }

  function cancel() {
    setMode({ kind: 'idle' })
    setNome('')
    setPrompt('')
    setError(null)
  }

  async function save() {
    if (!nome.trim() || !prompt.trim()) {
      setError('Preencha o nome e o prompt da auditoria.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (mode.kind === 'new') {
        const res = await fetch('/api/auditorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, prompt }),
        })
        if (!res.ok) throw new Error('Erro ao criar auditoria.')
      } else if (mode.kind === 'edit') {
        const res = await fetch(`/api/auditorias/${mode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, prompt }),
        })
        if (!res.ok) throw new Error('Erro ao salvar auditoria.')
      }
      await load()
      cancel()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Excluir esta auditoria? Essa ação não pode ser desfeita.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/auditorias/${id}`, { method: 'DELETE' })
      setAudits((prev) => prev.filter((a) => a.id !== id))
      if (mode.kind === 'edit' && mode.id === id) cancel()
    } finally {
      setDeletingId(null)
    }
  }

  const editing = mode.kind !== 'idle'

  return (
    <div className="min-h-screen bg-primary text-txt flex flex-col px-6 py-16 gap-8">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Auditorias</h1>
            <p className="text-txt/60 text-sm max-w-lg">
              Prompts de auditoria para os diferentes tipos de roteiro. Crie, edite ou exclua
              conforme cada formato.
            </p>
          </div>
          {!editing && (
            <button
              onClick={startNew}
              className="shrink-0 px-5 py-2.5 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors"
            >
              Nova auditoria
            </button>
          )}
        </div>

        {/* Editor */}
        {editing && (
          <div className="bg-second border border-txt/10 shadow-sm rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-sm font-semibold text-txt">
              {mode.kind === 'new' ? 'Nova auditoria' : 'Editar auditoria'}
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-txt/60 font-medium">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={saving}
                placeholder="Ex.: Roteiro de venda, Roteiro educativo, VSL..."
                className="w-full bg-primary border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-txt/60 font-medium">Prompt da auditoria</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={saving}
                rows={12}
                placeholder="Cole aqui o prompt que será usado para auditar esse tipo de roteiro..."
                className="w-full min-h-64 resize-y bg-primary border border-txt/15 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 disabled:opacity-50"
              />
              <span className="text-txt/50 text-xs">{prompt.length} caracteres</span>
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

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-second rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <p className="text-txt/50 text-sm">
            Nenhuma auditoria cadastrada ainda. Clique em “Nova auditoria” para criar a primeira.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {audits.map((a) => (
              <div
                key={a.id}
                className="bg-second border border-txt/10 shadow-sm rounded-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-txt font-semibold text-sm">{a.nome}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(a)}
                      className="text-txt/60 hover:text-gold transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      disabled={deletingId === a.id}
                      className="text-txt/50 hover:text-red-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5 disabled:opacity-40"
                    >
                      {deletingId === a.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </div>
                </div>
                <p className="text-txt/60 text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {a.prompt}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
