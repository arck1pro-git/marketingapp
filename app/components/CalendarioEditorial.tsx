'use client'

import { useEffect, useState } from 'react'

interface CalItem {
  id: number
  data: string // 'YYYY-MM-DD'
  conteudo: string
  tipo: string | null // 'dados' | 'opinativo' | 'produto'
  roteiro_carrossel: string | null
  roteiro_video: string | null
}

interface Calendario {
  id: number
  nome: string
  mes: string // 'YYYY-MM'
  posicionamento: string | null
  tipo: string
  created_at: string
  itens: CalItem[]
}

type ItemStatus = 'idle' | 'generating' | 'saving' | 'saved' | 'error'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const TIPO_LABEL: Record<string, string> = {
  dados: 'Dados',
  produto: 'Produto',
  opinativo: 'Opinativo',
}

// Cores distintas por tipo.
const TIPO_STYLE: Record<string, { tag: string; btn: string }> = {
  dados: {
    tag: 'text-blue-700 border-blue-300 bg-blue-50',
    btn: 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100',
  },
  produto: {
    tag: 'text-amber-700 border-amber-300 bg-amber-50',
    btn: 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100',
  },
  opinativo: {
    tag: 'text-emerald-700 border-emerald-300 bg-emerald-50',
    btn: 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
  },
}
function tipoStyle(tipo: string | null) {
  return (
    TIPO_STYLE[tipo ?? ''] ?? {
      tag: 'text-txt/60 border-txt/20',
      btn: 'text-txt/60 border-txt/20 hover:bg-txt/5',
    }
  )
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function dayLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function buildGrid(mes: string, itens: CalItem[]) {
  const [y, m] = mes.split('-').map(Number)
  const first = new Date(y, m - 1, 1).getDay()
  const last = new Date(y, m, 0).getDate()
  const byDate = new Map<string, CalItem[]>()
  for (const it of itens) {
    const key = it.data.slice(0, 10)
    const arr = byDate.get(key) ?? []
    arr.push(it)
    byDate.set(key, arr)
  }
  const cells: ({ day: number; date: string; items: CalItem[] } | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= last; d++) {
    const date = `${mes}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, date, items: byDate.get(date) ?? [] })
  }
  return cells
}

export default function CalendarioEditorial() {
  const [calendarios, setCalendarios] = useState<Calendario[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Calendario | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // item aberto (modal de roteiros)
  const [openItem, setOpenItem] = useState<CalItem | null>(null)
  const [rotCarrossel, setRotCarrossel] = useState('')
  const [rotVideo, setRotVideo] = useState('')
  const [itemStatus, setItemStatus] = useState<ItemStatus>('idle')
  const [itemError, setItemError] = useState<string | null>(null)

  // modal criar
  const [modalOpen, setModalOpen] = useState(false)
  const [mes, setMes] = useState(currentMonth())
  const [posicionamento, setPosicionamento] = useState('')
  const [dias, setDias] = useState<number[]>([])
  const [porDia, setPorDia] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/calendarios')
      if (res.ok) setCalendarios(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function patchItem(itemId: number, patch: Partial<CalItem>) {
    setSelected((prev) =>
      prev
        ? { ...prev, itens: prev.itens.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
        : prev
    )
    setCalendarios((prev) =>
      prev.map((c) =>
        c.id === selected?.id
          ? { ...c, itens: c.itens.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
          : c
      )
    )
  }

  async function generateRoteiros(it: CalItem) {
    setItemStatus('generating')
    setItemError(null)
    try {
      const res = await fetch(`/api/calendarios/itens/${it.id}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar roteiros.')
      setRotCarrossel(data.carrossel ?? '')
      setRotVideo(data.video ?? '')
      patchItem(it.id, { roteiro_carrossel: data.carrossel ?? '', roteiro_video: data.video ?? '' })
      setItemStatus('idle')
    } catch (e) {
      setItemError(e instanceof Error ? e.message : 'Erro desconhecido.')
      setItemStatus('idle')
    }
  }

  function openItemPanel(it: CalItem) {
    setOpenItem(it)
    setRotCarrossel(it.roteiro_carrossel ?? '')
    setRotVideo(it.roteiro_video ?? '')
    setItemError(null)
    setItemStatus('idle')
    if (!it.roteiro_carrossel && !it.roteiro_video) {
      generateRoteiros(it) // fallback caso algum item não tenha gerado
    }
  }

  async function saveRoteiros() {
    if (!openItem) return
    setItemStatus('saving')
    setItemError(null)
    try {
      const res = await fetch(`/api/calendarios/itens/${openItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roteiro_carrossel: rotCarrossel, roteiro_video: rotVideo }),
      })
      if (!res.ok) throw new Error()
      patchItem(openItem.id, { roteiro_carrossel: rotCarrossel, roteiro_video: rotVideo })
      setItemStatus('saved')
      setTimeout(() => setItemStatus('idle'), 2000)
    } catch {
      setItemStatus('error')
    }
  }

  function openModal() {
    setMes(currentMonth())
    setPosicionamento('')
    setDias([])
    setPorDia(1)
    setError(null)
    setModalOpen(true)
  }

  function toggleDia(d: number) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  async function generate() {
    if (!mes) return setError('Selecione o mês.')
    if (dias.length === 0) return setError('Selecione ao menos um dia da semana.')
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/calendarios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, posicionamento, dias, porDia }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar calendário.')
      setModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
    } finally {
      setGenerating(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Excluir este calendário? Essa ação não pode ser desfeita.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/calendarios/${id}`, { method: 'DELETE' })
      setCalendarios((prev) => prev.filter((c) => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } finally {
      setDeletingId(null)
    }
  }

  // ---- Visão de detalhe (calendário do mês) ----
  if (selected) {
    const cells = buildGrid(selected.mes, selected.itens)
    return (
      <div className="min-h-screen bg-primary text-txt flex flex-col px-6 py-10 gap-6">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { setSelected(null); setOpenItem(null) }}
              className="self-start text-txt/60 hover:text-txt text-xs font-medium mb-1"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold tracking-tight capitalize">{monthLabel(selected.mes)}</h1>
            {selected.posicionamento && (
              <p className="text-txt/60 text-sm">{selected.posicionamento}</p>
            )}
          </div>

          {/* Grade do mês */}
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-txt/50 py-1">
                {w}
              </div>
            ))}
            {cells.map((cell, i) =>
              cell === null ? (
                <div key={`e${i}`} className="rounded-lg" />
              ) : (
                <div
                  key={cell.day}
                  className={`min-h-20 rounded-lg border p-1.5 flex flex-col gap-1.5 ${
                    cell.items.length > 0 ? 'bg-second border-txt/15' : 'border-txt/10 bg-primary'
                  }`}
                >
                  <span className={`text-xs font-semibold ${cell.items.length > 0 ? 'text-txt' : 'text-txt/40'}`}>
                    {cell.day}
                  </span>
                  <div className="flex flex-col gap-1">
                    {cell.items.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => openItemPanel(it)}
                        className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-1 border transition-colors text-left ${tipoStyle(it.tipo).btn}`}
                      >
                        {TIPO_LABEL[it.tipo ?? ''] ?? it.tipo ?? 'Conteúdo'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Modal sobreposto do item (fundo blur) */}
        {openItem && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget && itemStatus !== 'saving') setOpenItem(null) }}
          >
            <div className="w-full sm:max-w-2xl bg-primary border border-txt/10 shadow-2xl rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 w-fit border ${tipoStyle(openItem.tipo).tag}`}>
                    {TIPO_LABEL[openItem.tipo ?? ''] ?? openItem.tipo}
                  </span>
                  <h2 className="text-base font-semibold text-txt capitalize leading-snug">
                    {dayLabel(openItem.data.slice(0, 10))}
                  </h2>
                  <p className="text-xs text-txt/60">{openItem.conteudo}</p>
                </div>
                <button onClick={() => setOpenItem(null)} className="text-txt/50 hover:text-txt shrink-0" aria-label="Fechar">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {itemStatus === 'generating' ? (
                <p className="text-txt/50 text-sm py-6 text-center">Gerando roteiros…</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-txt/60 font-medium">Roteiro — Carrossel</label>
                    <textarea
                      value={rotCarrossel}
                      onChange={(e) => setRotCarrossel(e.target.value)}
                      rows={8}
                      className="w-full min-h-40 resize-y bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-txt focus:outline-none focus:border-txt/40"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-txt/60 font-medium">Roteiro — Vídeo (45s)</label>
                    <textarea
                      value={rotVideo}
                      onChange={(e) => setRotVideo(e.target.value)}
                      rows={8}
                      className="w-full min-h-40 resize-y bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-txt focus:outline-none focus:border-txt/40"
                    />
                  </div>

                  {itemError && (
                    <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                      {itemError}
                    </p>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => generateRoteiros(openItem)}
                      disabled={itemStatus === 'saving'}
                      className="px-4 py-2 rounded-full border border-txt/15 text-txt/60 font-semibold text-sm hover:border-txt/40 hover:text-txt transition-colors disabled:opacity-50"
                    >
                      Regerar
                    </button>
                    <button
                      onClick={saveRoteiros}
                      disabled={itemStatus === 'saving'}
                      className="px-5 py-2 rounded-full bg-gold text-txt font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {itemStatus === 'saving' ? 'Salvando…' : itemStatus === 'saved' ? 'Salvo!' : 'Salvar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Visão de lista ----
  return (
    <div className="min-h-screen bg-primary text-txt flex flex-col px-6 py-16 gap-8">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Calendário Editorial</h1>
            <p className="text-txt/60 text-sm max-w-lg">
              Planeje o mês de postagens. Cada calendário gera o que será publicado em cada dia.
            </p>
          </div>
          <button
            onClick={openModal}
            className="shrink-0 px-5 py-2.5 rounded-full bg-gold text-txt font-semibold text-sm hover:bg-gold/90 transition-colors"
          >
            Criar calendário
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-second rounded-xl p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : calendarios.length === 0 ? (
          <p className="text-txt/50 text-sm">
            Nenhum calendário ainda. Clique em “Criar calendário” para começar.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {calendarios.map((c) => (
              <div
                key={c.id}
                className="bg-second border border-txt/10 shadow-sm rounded-xl p-5 flex items-center justify-between gap-3"
              >
                <button
                  onClick={() => { setSelected(c); setOpenItem(null) }}
                  className="flex flex-col gap-0.5 min-w-0 text-left"
                >
                  <p className="text-txt font-semibold text-sm capitalize truncate">{monthLabel(c.mes)}</p>
                  <p className="text-txt/50 text-xs">{c.itens.length} conteúdo(s)</p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setSelected(c); setOpenItem(null) }}
                    className="text-txt/60 hover:text-txt transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    disabled={deletingId === c.id}
                    className="text-txt/50 hover:text-red-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5 disabled:opacity-40"
                  >
                    {deletingId === c.id ? 'Excluindo…' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar calendário */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget && !generating) setModalOpen(false) }}
        >
          <div className="w-full sm:max-w-lg bg-primary border border-txt/10 shadow-2xl rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <p className="text-txt font-semibold text-base">Criar calendário</p>
              {!generating && (
                <button onClick={() => setModalOpen(false)} className="text-txt/50 hover:text-txt" aria-label="Fechar">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="mes" className="text-xs text-txt/60 font-medium">Mês</label>
              <input
                id="mes"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                disabled={generating}
                className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt focus:outline-none focus:border-txt/40 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="pos" className="text-xs text-txt/60 font-medium">Posicionamento do mês</label>
              <textarea
                id="pos"
                value={posicionamento}
                onChange={(e) => setPosicionamento(e.target.value)}
                disabled={generating}
                rows={3}
                placeholder="Como quer que seja o mês de postagens? Tema, objetivo, tom, campanha..."
                className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 resize-none disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-txt/60 font-medium">Dias com conteúdo</label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((w, i) => {
                  const active = dias.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i)}
                      disabled={generating}
                      className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-gold text-txt border-gold'
                          : 'border-txt/15 text-txt/60 hover:border-txt/40 hover:text-txt'
                      } disabled:opacity-50`}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="porDia" className="text-xs text-txt/60 font-medium">
                Conteúdos por dia
              </label>
              <input
                id="porDia"
                type="number"
                min={1}
                max={5}
                value={porDia}
                onChange={(e) => setPorDia(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                disabled={generating}
                className="w-28 bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt focus:outline-none focus:border-txt/40 disabled:opacity-50"
              />
              <span className="text-txt/40 text-xs">
                O tipo de cada conteúdo (dados, produto ou opinativo) é sorteado na geração.
              </span>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              onClick={generate}
              disabled={generating}
              className="w-full py-3 rounded-full bg-gold text-txt font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Gerando calendário e roteiros…' : 'Gerar calendário'}
            </button>
            {generating && (
              <p className="text-txt/40 text-xs text-center -mt-2">
                Gerando as ideias e os 2 roteiros de cada dia. Pode levar um a dois minutos.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
