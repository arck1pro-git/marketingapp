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

// Cores das tags: carrossel = roxo, vídeo = verde escuro.
const TIPO_TAG: Record<string, string> = {
  carrossel: 'text-purple-700 border-purple-300 bg-purple-50',
  video: 'text-green-800 border-green-400 bg-green-50',
}
function tipoTag(tipo: string | null) {
  return TIPO_TAG[tipo ?? 'carrossel'] ?? 'text-gold border-gold/40'
}

type Mode = { kind: 'idle' } | { kind: 'edit'; id: number }
type Filtro = 'todos' | 'carrossel' | 'video'

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
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')

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
    setDeletingId(id)
    try {
      await fetch(`/api/roteiros/${id}`, { method: 'DELETE' })
      setRoteiros((prev) => prev.filter((r) => r.id !== id))
      if (mode.kind === 'edit' && mode.id === id) cancel()
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  const visiveis = roteiros.filter(
    (r) => filtro === 'todos' || (r.tipo ?? 'carrossel') === filtro
  )

  return (
    <div className="min-h-screen bg-primary text-txt flex flex-col px-6 py-16 gap-8">
      <div className="w-full flex flex-col gap-8">

        {/* Cabeçalho */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Roteiros</h1>
          <p className="text-txt/60 text-sm max-w-lg">
            Seus roteiros salvos de carrossel e vídeo — edite, copie ou exclua.
          </p>
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

        {/* Filtro por tipo */}
        {!loading && roteiros.length > 0 && (
          <div className="flex gap-1.5">
            {([
              ['todos', 'Todos'],
              ['carrossel', 'Carrossel'],
              ['video', 'Vídeo'],
            ] as [Filtro, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFiltro(k)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filtro === k
                    ? 'bg-gold text-white'
                    : 'bg-second text-txt/60 hover:bg-txt/10 hover:text-txt'
                }`}
              >
                {label}
              </button>
            ))}
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
        ) : visiveis.length === 0 ? (
          <p className="text-txt/50 text-sm">Nenhum roteiro desse tipo.</p>
        ) : (
          // Esteira: todos os roteiros como cards, um ao lado do outro.
          <div className="flex items-stretch gap-4 overflow-x-auto pb-2">
            {visiveis.map((r) => {
              const col = r.tipo === 'video' ? 'video' : 'carrossel'
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 w-72 shrink-0 h-[75vh] bg-second border border-txt/10 shadow-sm rounded-xl p-4"
                >
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 border ${tipoTag(col)}`}
                      >
                        {TIPO_LABEL[col]}
                      </span>
                      <p className="text-txt font-semibold text-sm leading-snug truncate">{r.nome}</p>
                    </div>
                    <p className="text-txt/50 text-xs">{formatDate(r.created_at)}</p>
                  </div>

                  {/* Texto do roteiro — preenche a altura do card e rola internamente */}
                  <div className="flex-1 min-h-0 overflow-y-auto bg-primary border border-txt/10 rounded-lg p-3">
                    <p className="text-xs text-txt/70 leading-relaxed whitespace-pre-wrap">{r.texto}</p>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5">
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
                    {confirmId === r.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => remove(r.id)}
                          disabled={deletingId === r.id}
                          className="text-red-600 hover:text-red-700 transition-colors text-xs font-semibold px-2 py-1 rounded-md hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === r.id ? 'Excluindo…' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          disabled={deletingId === r.id}
                          className="text-txt/50 hover:text-txt transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(r.id)}
                        className="text-txt/50 hover:text-red-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
