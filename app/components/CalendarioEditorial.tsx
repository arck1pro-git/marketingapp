'use client'

import { useEffect, useState } from 'react'
import WaitingText from './WaitingText'

interface CalItem {
  id: number
  data: string // 'YYYY-MM-DD'
  conteudo: string
  tipo: string | null // 'dados' | 'opinativo' | 'produto'
  roteiro_carrossel: string | null
  roteiro_video: string | null
  fonte_titulo: string | null
  fonte_url: string | null
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
type Formato = 'carrossel' | 'video'

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
  const [confirmId, setConfirmId] = useState<number | null>(null)

  // dia selecionado (sidebar direita) + item aberto (modal de roteiros)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [openItem, setOpenItem] = useState<CalItem | null>(null)
  const [formato, setFormato] = useState<Formato>('carrossel')
  const [rotCarrossel, setRotCarrossel] = useState('')
  const [rotVideo, setRotVideo] = useState('')
  const [itemStatus, setItemStatus] = useState<ItemStatus>('idle')
  const [itemError, setItemError] = useState<string | null>(null)
  const [fonte, setFonte] = useState<{ titulo: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [audits, setAudits] = useState<{ id: number; nome: string }[]>([])
  const [auditoriaId, setAuditoriaId] = useState<number | ''>('')

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
    fetch('/api/auditorias')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: number; nome: string }[]) => {
        setAudits(data)
        if (data.length > 0) setAuditoriaId(data[0].id)
      })
      .catch(() => setAudits([]))
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

  // Gera o roteiro do formato selecionado, usando a auditoria escolhida.
  async function generateRoteiros(it: CalItem) {
    if (!auditoriaId) {
      setItemError('Selecione uma auditoria.')
      return
    }
    setItemStatus('generating')
    setItemError(null)
    try {
      const res = await fetch(`/api/calendarios/itens/${it.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formato, auditoriaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar roteiro.')
      const texto = data.texto ?? ''
      if (formato === 'carrossel') setRotCarrossel(texto)
      else setRotVideo(texto)
      setFonte(data.fonte ?? null)
      patchItem(it.id, {
        ...(formato === 'carrossel'
          ? { roteiro_carrossel: texto }
          : { roteiro_video: texto }),
        fonte_titulo: data.fonte?.titulo ?? it.fonte_titulo ?? null,
        fonte_url: data.fonte?.url ?? it.fonte_url ?? null,
      })
      setItemStatus('idle')
    } catch (e) {
      setItemError(e instanceof Error ? e.message : 'Erro desconhecido.')
      setItemStatus('idle')
    }
  }

  async function copyRoteiro(texto: string) {
    if (!texto.trim()) return
    try {
      await navigator.clipboard.writeText(texto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setItemError('Não foi possível copiar.')
    }
  }

  function openItemPanel(it: CalItem) {
    setOpenItem(it)
    setFormato('carrossel')
    setRotCarrossel(it.roteiro_carrossel ?? '')
    setRotVideo(it.roteiro_video ?? '')
    setFonte(it.fonte_url ? { titulo: it.fonte_titulo ?? 'matéria', url: it.fonte_url } : null)
    setItemError(null)
    setItemStatus('idle')
    setCopied(false)
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
    setDeletingId(id)
    try {
      await fetch(`/api/calendarios/${id}`, { method: 'DELETE' })
      setCalendarios((prev) => prev.filter((c) => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  // ---- Visão de detalhe (calendário do mês) ----
  if (selected) {
    const cells = buildGrid(selected.mes, selected.itens)
    const weeks = Math.ceil(cells.length / 7)
    const dayItems = selectedDay
      ? selected.itens.filter((it) => it.data.slice(0, 10) === selectedDay)
      : []
    const rotAtual = formato === 'carrossel' ? rotCarrossel : rotVideo
    const setRotAtual = formato === 'carrossel' ? setRotCarrossel : setRotVideo

    return (
      // Altura = viewport menos o Header (2 linhas + m-2 ≈ 7rem). Sem rolagem.
      <div className="h-[calc(100vh-7rem)] overflow-hidden bg-primary text-txt flex flex-col px-6 py-4 gap-3">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex flex-col">
            <button
              onClick={() => { setSelected(null); setOpenItem(null); setSelectedDay(null) }}
              className="self-start text-txt/60 hover:text-txt text-xs font-medium mb-0.5"
            >
              ← Voltar
            </button>
            <h1 className="text-xl font-bold tracking-tight capitalize leading-tight">{monthLabel(selected.mes)}</h1>
            {selected.posicionamento && (
              <p className="text-txt/50 text-xs truncate max-w-2xl">{selected.posicionamento}</p>
            )}
          </div>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1.5 shrink-0">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-txt/50">
              {w}
            </div>
          ))}
        </div>

        {/* Grade do mês — ocupa a altura restante */}
        <div
          className="grid grid-cols-7 gap-1.5 flex-1 min-h-0"
          style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={`e${i}`} className="rounded-lg" />
            ) : (
              <button
                key={cell.day}
                type="button"
                disabled={cell.items.length === 0}
                onClick={() => setSelectedDay(cell.date)}
                className={`min-h-0 rounded-lg border p-2 flex flex-col items-start transition-colors ${
                  cell.items.length > 0
                    ? `bg-second border-txt/15 hover:border-dark cursor-pointer ${
                        selectedDay === cell.date ? 'ring-2 ring-dark border-dark' : ''
                      }`
                    : 'border-txt/10 bg-primary cursor-default'
                }`}
              >
                <span className={`text-xs font-semibold ${cell.items.length > 0 ? 'text-txt' : 'text-txt/40'}`}>
                  {cell.day}
                </span>
                {cell.items.length > 0 && (
                  <span className="m-auto flex flex-col items-center leading-none">
                    <span className="text-2xl font-bold text-dark">{cell.items.length}</span>
                    <span className="text-[10px] text-txt/50 mt-1">
                      {cell.items.length === 1 ? 'conteúdo' : 'conteúdos'}
                    </span>
                  </span>
                )}
              </button>
            )
          )}
        </div>

        {/* Sidebar direita — conteúdos do dia */}
        {selectedDay && (
          <div className="fixed right-0 top-0 h-screen w-72 bg-primary border-l border-txt/10 shadow-2xl z-40 flex flex-col">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-txt/10">
              <h2 className="text-sm font-semibold capitalize leading-snug">{dayLabel(selectedDay)}</h2>
              <button onClick={() => setSelectedDay(null)} className="text-txt/50 hover:text-txt shrink-0" aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4 overflow-y-auto">
              {dayItems.map((it) => (
                <div
                  key={it.id}
                  className="flex flex-col gap-1.5 rounded-xl border border-txt/15 p-3 transition-colors hover:bg-txt/5"
                >
                  <button
                    type="button"
                    onClick={() => openItemPanel(it)}
                    className="flex flex-col gap-1.5 text-left"
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 w-fit border ${tipoStyle(it.tipo).tag}`}>
                      {TIPO_LABEL[it.tipo ?? ''] ?? it.tipo ?? 'Conteúdo'}
                    </span>
                    <p className="text-xs text-txt/70 line-clamp-3">{it.conteudo}</p>
                  </button>
                  {it.fonte_url && (
                    <a
                      href={it.fonte_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gold hover:underline truncate"
                    >
                      Fonte: {it.fonte_titulo ?? 'matéria'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal sobreposto do item (roteiros) */}
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
                <div className="py-6 flex flex-col items-center gap-1.5">
                  <WaitingText className="text-sm font-medium text-txt" />
                  <p className="text-xs text-txt/50">
                    {openItem.fonte_url || openItem.tipo === 'dados'
                      ? 'Lendo a matéria real e gerando o roteiro. Pode levar alguns segundos.'
                      : 'Gerando o roteiro.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Seletor de visualização (formato) */}
                  <div className="flex gap-1 p-1 bg-second rounded-full w-fit">
                    {(['carrossel', 'video'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormato(f)}
                        className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          formato === f ? 'bg-dark text-white' : 'text-txt/60 hover:text-txt'
                        }`}
                      >
                        {f === 'carrossel' ? 'Carrossel' : 'Vídeo'}
                      </button>
                    ))}
                  </div>

                  {/* Auditoria — dita como o roteiro é construído */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-txt/60 font-medium">Auditoria</label>
                    {audits.length === 0 ? (
                      <p className="text-xs text-txt/50">
                        Nenhuma auditoria cadastrada. Crie uma em{' '}
                        <span className="text-gold">Auditorias</span> antes de gerar.
                      </p>
                    ) : (
                      <select
                        value={auditoriaId}
                        onChange={(e) => setAuditoriaId(Number(e.target.value))}
                        disabled={itemStatus === 'saving'}
                        className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt focus:outline-none focus:border-txt/40 disabled:opacity-50"
                      >
                        {audits.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs text-txt/60 font-medium">
                        {formato === 'carrossel' ? 'Roteiro — Carrossel' : 'Roteiro — Vídeo (45s)'}
                      </label>
                      <button
                        type="button"
                        onClick={() => copyRoteiro(rotAtual)}
                        disabled={!rotAtual.trim()}
                        className="text-xs font-medium text-txt/60 hover:text-txt border border-txt/15 hover:border-txt/40 rounded-full px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <textarea
                      value={rotAtual}
                      onChange={(e) => setRotAtual(e.target.value)}
                      rows={12}
                      className="w-full min-h-60 resize-y bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-txt focus:outline-none focus:border-txt/40"
                    />
                  </div>

                  {fonte && (
                    <p className="text-[11px] text-txt/50">
                      Baseado na matéria:{' '}
                      <a
                        href={fonte.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:underline"
                      >
                        {fonte.titulo}
                      </a>
                    </p>
                  )}

                  {itemError && (
                    <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                      {itemError}
                    </p>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => generateRoteiros(openItem)}
                      disabled={itemStatus === 'saving' || audits.length === 0}
                      className="px-4 py-2 rounded-full border border-txt/15 text-txt/60 font-semibold text-sm hover:border-txt/40 hover:text-txt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(formato === 'carrossel' ? rotCarrossel : rotVideo)
                        ? `Regerar ${formato === 'carrossel' ? 'carrossel' : 'vídeo'}`
                        : `Gerar ${formato === 'carrossel' ? 'carrossel' : 'vídeo'}`}
                    </button>
                    <button
                      onClick={saveRoteiros}
                      disabled={itemStatus === 'saving'}
                      className="px-5 py-2 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="w-full flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Calendário Editorial</h1>
            <p className="text-txt/60 text-sm max-w-lg">
              Planeje o mês de postagens. Cada calendário gera o que será publicado em cada dia.
            </p>
          </div>
          <button
            onClick={openModal}
            className="shrink-0 px-5 py-2.5 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors"
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
                  onClick={() => { setSelected(c); setOpenItem(null); setSelectedDay(null) }}
                  className="flex flex-col gap-0.5 min-w-0 text-left"
                >
                  <p className="text-txt font-semibold text-sm capitalize truncate">{monthLabel(c.mes)}</p>
                  <p className="text-txt/50 text-xs">{c.itens.length} conteúdo(s)</p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setSelected(c); setOpenItem(null); setSelectedDay(null) }}
                    className="text-txt/60 hover:text-txt transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                  >
                    Abrir
                  </button>
                  {confirmId === c.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => remove(c.id)}
                        disabled={deletingId === c.id}
                        className="text-red-600 hover:text-red-700 transition-colors text-xs font-semibold px-2 py-1 rounded-md hover:bg-red-50 disabled:opacity-40"
                      >
                        {deletingId === c.id ? 'Excluindo…' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId === c.id}
                        className="text-txt/50 hover:text-txt transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmId(c.id)}
                      className="text-txt/50 hover:text-red-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-txt/5"
                    >
                      Excluir
                    </button>
                  )}
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
                          ? 'bg-gold text-white border-gold'
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
                No máximo 1 conteúdo de “dados” por dia; os demais variam entre produto e
                opinativo. Parte deles é baseada em matérias reais (com link), o resto é geral.
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
              className="w-full py-3 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Gerando calendário…' : 'Gerar calendário'}
            </button>
            {generating && (
              <p className="text-txt/40 text-xs text-center -mt-2">
                Gerando as ideias do mês. Os roteiros são criados depois, ao abrir cada dia.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
