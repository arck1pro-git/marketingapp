'use client'

import { useEffect, useState } from 'react'

// Palavras "de espera" no estilo do Claude Code — trocam a cada 5s pra dar
// vida à espera. Tema: marketing/conteúdo + a marca (Ari).
const DEFAULT_WORDS = [
  'Editalizando',
  'Superconvertendo',
  'Arilizando',
  'Roteirizando',
  'Viralizando',
  'Engajando',
  'Pautando',
  'Carrosselizando',
  'Calendarizando',
  'Copywritando',
  'Estrategizando',
  'Posicionando',
  'Brandando',
  'Algoritmizando',
  'Audienciando',
  'Hashtagueando',
  'Impactando',
  'Funilizando',
  'Otimizando',
  'Convertendo',
]

export default function WaitingText({
  words = DEFAULT_WORDS,
  intervalMs = 5000,
  className = '',
}: {
  words?: string[]
  intervalMs?: number
  className?: string
}) {
  const [i, setI] = useState(() => Math.floor(Math.random() * words.length))

  useEffect(() => {
    const id = setInterval(() => {
      // Próxima palavra aleatória, sem repetir a atual.
      setI((prev) => {
        if (words.length < 2) return prev
        let n = prev
        while (n === prev) n = Math.floor(Math.random() * words.length)
        return n
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [words, intervalMs])

  return <span className={className}>{words[i]}…</span>
}
