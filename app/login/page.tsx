'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn('credentials', { nome, senha, redirect: false })
    setLoading(false)

    if (res?.error) {
      setError('Nome ou senha inválidos.')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-txt px-6">
      <div className="w-full max-w-sm bg-primary rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold tracking-tight text-txt">
            Agilizy<span className="text-gold">.AI</span>
          </span>
          <p className="text-sm text-txt/60">Entre para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-xs font-medium text-txt/60">Nome</label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
              className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="senha" className="text-xs font-medium text-txt/60">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              className="w-full bg-second border border-txt/15 rounded-xl px-3 py-2.5 text-sm text-txt placeholder:text-txt/40 focus:outline-none focus:border-txt/40 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
