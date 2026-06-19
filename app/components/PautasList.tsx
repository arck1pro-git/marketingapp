'use client'

import { useEffect, useState } from 'react'
import PautaModal from './PautaModal'

interface NewsItem {
  title: string
  description: string
  link: string
  pubDate?: string
}

type Category = 'porto_belo' | 'sc' | 'investimentos' | 'imoveis' | 'geral'

// "há X min/h/dias" a partir do pubDate do RSS.
function relativeDate(pubDate?: string): string | null {
  if (!pubDate) return null
  const t = new Date(pubDate).getTime()
  if (Number.isNaN(t)) return null
  const min = Math.round((Date.now() - t) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'há 1 dia' : `há ${d} dias`
}

const TABS: { key: Category; label: string }[] = [
  { key: 'porto_belo', label: 'Porto Belo' },
  { key: 'sc', label: 'Santa Catarina' },
  { key: 'investimentos', label: 'Investimentos' },
  { key: 'imoveis', label: 'Imóveis' },
  { key: 'geral', label: 'Em alta' },
]

export default function PautasList() {
  const [data, setData] = useState<Record<string, NewsItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Category>('porto_belo')
  const [selected, setSelected] = useState<NewsItem | null>(null)

  useEffect(() => {
    fetch('/api/pautas')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  const items: NewsItem[] = data[tab] ?? []

  return (
    <>
      <div className="min-h-screen bg-primary text-txt flex flex-col px-6 py-16 gap-8">

        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-gold text-white'
                  : 'bg-second text-txt/60 hover:bg-txt/10 hover:text-txt'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 justify-items-start">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-auto bg-second rounded-xl p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-txt/50 text-sm">Nenhuma notícia encontrada.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 justify-items-start">
            {items.map((item, i) => {
              const when = relativeDate(item.pubDate)
              return (
                <div
                  key={i}
                  className="w-auto bg-second border border-txt/10 shadow-sm rounded-xl p-5 flex flex-col gap-2.5"
                >
                  <div className="flex flex-col gap-1">
                    {when && (
                      <span className="text-[11px] text-txt/40 font-medium uppercase tracking-wide">
                        {when}
                      </span>
                    )}
                    <p className="text-txt font-semibold text-sm leading-snug">{item.title}</p>
                  </div>

                  <button
                    onClick={() => setSelected(item)}
                    className="mt-auto self-start inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary border border-txt/15 text-txt/70 text-xs font-medium hover:text-gold hover:border-gold/50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    Gerar roteiro
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <PautaModal
          newsTitle={selected.title}
          newsLink={selected.link}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
