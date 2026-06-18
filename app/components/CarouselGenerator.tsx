'use client'

import { useEffect, useRef, useState } from 'react'

interface Slide {
  slide: number
  titulo: string
  texto: string
}

interface SavedSlide {
  id: number
  slide_order: number
  body: string
  image_url: string
}

interface SavedCarousel {
  id: number
  title: string
  created_at: string
  slides: SavedSlide[]
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      if (lines.length >= maxLines) return lines
      current = word
    } else {
      current = test
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

async function renderSlideToCanvas(
  imgSrc: string | undefined,
  slide: Slide,
  total: number,
  fontFamily: string
): Promise<HTMLCanvasElement> {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#13293d'
  ctx.fillRect(0, 0, W, H)

  if (imgSrc) {
    try {
      const img = new Image()
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = rej
        img.src = imgSrc
      })
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    } catch {
      // keep dark background
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, W, H)

  const M = 48
  const textW = W - M * 2
  const numSize = 30
  const titleSize = 56
  const isFirst = slide.slide === 1
  const bodySize = isFirst ? 36 : 28
  const titleLineH = 68
  const bodyLineH = isFirst ? 52 : 42
  const numLineH = 42
  const gapNT = 18
  const gapTB = 18

  ctx.font = `bold ${titleSize}px ${fontFamily}`
  const titleLines = slide.titulo ? wrapLines(ctx, slide.titulo, textW, 3) : []

  ctx.font = `${bodySize}px ${fontFamily}`
  const bodyLines = wrapLines(ctx, slide.texto, textW, 10)

  const titleBlock = titleLines.length > 0 ? titleLines.length * titleLineH + gapTB : 0
  const totalTextH = numLineH + gapNT + titleBlock + bodyLines.length * bodyLineH

  let y = H - M - totalTextH

  ctx.font = `600 ${numSize}px ${fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(`${slide.slide} / ${total}`, M, y + numSize)
  y += numLineH + gapNT

  if (titleLines.length > 0) {
    ctx.font = `bold ${titleSize}px ${fontFamily}`
    ctx.fillStyle = '#ffffff'
    for (const line of titleLines) {
      ctx.fillText(line, M, y + titleSize)
      y += titleLineH
    }
    y += gapTB
  }

  ctx.font = `${bodySize}px ${fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (const line of bodyLines) {
    ctx.fillText(line, M, y + bodySize)
    y += bodyLineH
  }

  return canvas
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function savedSlideToSlide(s: SavedSlide): Slide {
  try {
    const parsed = JSON.parse(s.body) as { titulo?: string; texto?: string }
    return { slide: s.slide_order, titulo: parsed.titulo ?? '', texto: parsed.texto ?? s.body }
  } catch {
    return { slide: s.slide_order, titulo: '', texto: s.body }
  }
}

export default function CarouselGenerator() {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [newsTitle, setNewsTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedCarousels, setSavedCarousels] = useState<SavedCarousel[]>([])
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [downloadingCarouselId, setDownloadingCarouselId] = useState<number | null>(null)
  const slidesRef = useRef<HTMLDivElement>(null)

  async function loadSaved() {
    const res = await fetch('/api/carousels')
    if (res.ok) setSavedCarousels(await res.json())
  }

  useEffect(() => {
    loadSaved()

    const rawSlides = sessionStorage.getItem('carousel_slides')
    const rawImages = sessionStorage.getItem('carousel_images')
    const rawTitle = sessionStorage.getItem('carousel_newstitle')
    if (!rawSlides) return
    try {
      const parsedSlides = JSON.parse(rawSlides) as Slide[]
      const parsedImages = rawImages ? (JSON.parse(rawImages) as string[]) : []
      setSlides(parsedSlides)
      setImages(parsedImages)
      setNewsTitle(rawTitle ?? '')
    } catch {
      // malformed — ignore
    } finally {
      sessionStorage.removeItem('carousel_slides')
      sessionStorage.removeItem('carousel_images')
      sessionStorage.removeItem('carousel_newstitle')
    }
  }, [])

  async function generate() {
    setLoading(true)
    setError(null)
    setSlides(null)

    try {
      const [imgRes, carouselRes] = await Promise.all([
        fetch('/api/images'),
        fetch('/api/generate-carousel', { method: 'POST' }),
      ])

      const imgData = await imgRes.json()
      const carouselData = await carouselRes.json()

      if (carouselData.error) throw new Error(carouselData.error)
      if (!Array.isArray(carouselData.slides) || carouselData.slides.length === 0) {
        throw new Error('Nenhum slide retornado.')
      }

      const loadedSlides: Slide[] = carouselData.slides
      const loadedImages: string[] = imgData.images ?? []
      const loadedTitle: string = carouselData.newsTitle ?? ''

      setImages(loadedImages)
      setSlides(loadedSlides)
      setNewsTitle(loadedTitle)

      // Auto-save
      await fetch('/api/carousels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: loadedTitle, slides: loadedSlides, images: loadedImages }),
      })
      await loadSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  async function downloadSavedCarousel(carousel: SavedCarousel) {
    setDownloadingCarouselId(carousel.id)
    try {
      const fontFamily =
        getComputedStyle(document.body).fontFamily || 'Arial, Helvetica, sans-serif'
      const parsedSlides = carousel.slides.map(savedSlideToSlide)

      for (let i = 0; i < parsedSlides.length; i++) {
        const imgSrc = carousel.slides[i].image_url || undefined
        const canvas = await renderSlideToCanvas(imgSrc, parsedSlides[i], parsedSlides.length, fontFamily)

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `slide-${i + 1}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        await new Promise((r) => setTimeout(r, 400))
      }
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloadingCarouselId(null)
    }
  }

  async function deleteCarousel(id: number) {
    setDeletingId(id)
    await fetch(`/api/carousels/${id}`, { method: 'DELETE' })
    setSavedCarousels((prev) => prev.filter((c) => c.id !== id))
    setDeletingId(null)
  }

  async function downloadAll() {
    if (!slides) return
    setDownloading(true)

    try {
      const fontFamily =
        getComputedStyle(document.body).fontFamily || 'Arial, Helvetica, sans-serif'

      for (let i = 0; i < slides.length; i++) {
        const imgSrc = images.length > 0 ? images[i % images.length] : undefined
        const canvas = await renderSlideToCanvas(imgSrc, slides[i], slides.length, fontFamily)

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
        })

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `slide-${i + 1}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        await new Promise((r) => setTimeout(r, 400))
      }
    } catch (e) {
      console.error('Download failed:', e)
      alert('Erro ao baixar imagens: ' + (e instanceof Error ? e.message : 'desconhecido'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary text-txt flex flex-col items-center px-6 py-16 gap-8">
      {/* Header + ação */}
      <div className="w-full max-w-4xl flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 text-left">
          <h1 className="text-3xl font-bold tracking-tight">Carrosseis criados</h1>
          <p className="text-txt/60 text-sm max-w-md">
            
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-lg max-w-md text-center">
          {error}
        </p>
      )}

      {newsTitle && (
        <p className="text-txt/50 text-xs max-w-lg text-center">
          Baseado em:{' '}
          <span className="text-txt/70 italic">&ldquo;{newsTitle}&rdquo;</span>
        </p>
      )}

      {slides && (
        <>
          <div
            ref={slidesRef}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl"
          >
            {slides.map((slide, i) => {
              const imgSrc = images[i % Math.max(images.length, 1)]
              const isFirstSlide = slide.slide === 1
              return (
                <div
                  key={slide.slide}
                  className="carousel-slide relative overflow-hidden rounded-xl bg-dark"
                  style={{ aspectRatio: '4 / 5' }}
                >
                  {imgSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/55" />
                  <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-3 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
                      {slide.slide} / {slides.length}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 m-3 flex flex-col gap-2">
                    {slide.titulo && (
                      <h2 className="font-bold text-base md:text-lg leading-tight text-white">
                        {slide.titulo}
                      </h2>
                    )}
                    <p
                      className={`${
                        isFirstSlide
                          ? 'font-medium text-xs md:text-sm'
                          : 'font-normal text-[10px] md:text-xs'
                      } text-white/90 leading-snug`}
                    >
                      {slide.texto}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={downloadAll}
            disabled={downloading}
            className="px-8 py-3 rounded-full border border-txt text-txt font-semibold text-sm hover:bg-txt hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Baixando…' : 'Baixar Imagens'}
          </button>
        </>
      )}

      {/* Saved carousels */}
      {savedCarousels.length > 0 && (
        <div className="w-full max-w-4xl flex flex-col gap-4 pt-4 border-t border-txt/10">
          <h2 className="text-sm font-semibold text-txt/60 uppercase tracking-widest">
            Carrosseis salvos
          </h2>
          <div className="flex flex-col gap-3">
            {savedCarousels.map((c) => {
              const parsedSlides = c.slides.map(savedSlideToSlide)
              const isDownloading = downloadingCarouselId === c.id
              return (
                <div
                  key={c.id}
                  className="bg-second border border-txt/10 shadow-sm rounded-xl p-4 flex flex-col gap-3"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-txt text-sm font-semibold truncate">{c.title}</p>
                      <p className="text-txt/50 text-xs">
                        {c.slides.length} slides · {formatDate(c.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => downloadSavedCarousel(c)}
                        disabled={isDownloading || downloadingCarouselId !== null}
                        className="text-txt/60 hover:text-txt transition-colors disabled:opacity-40"
                        aria-label="Baixar"
                      >
                        {isDownloading ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="animate-spin">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => deleteCarousel(c.id)}
                        disabled={deletingId === c.id}
                        className="text-txt/50 hover:text-red-600 transition-colors disabled:opacity-40"
                        aria-label="Excluir"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M3 4h10M6 4V2.5h4V4M5.5 4l.5 8.5M8 4v8.5M10.5 4l-.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Slide thumbnails */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {parsedSlides.map((slide, i) => {
                      const imgSrc = c.slides[i]?.image_url || undefined
                      const isFirst = slide.slide === 1
                      return (
                        <div
                          key={slide.slide}
                          className="relative overflow-hidden rounded-lg bg-dark"
                          style={{ aspectRatio: '4 / 5' }}
                        >
                          {imgSrc && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgSrc}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/55" />
                          <div className="absolute top-0 left-0 right-0 px-1.5 pt-1.5">
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-white/50">
                              {slide.slide}/{parsedSlides.length}
                            </span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 m-1.5 flex flex-col gap-0.5">
                            {slide.titulo && (
                              <p className="font-bold text-[9px] leading-tight text-white line-clamp-2">
                                {slide.titulo}
                              </p>
                            )}
                            <p className={`${isFirst ? 'text-[8px]' : 'text-[7px]'} text-white/80 leading-snug line-clamp-3`}>
                              {slide.texto}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
