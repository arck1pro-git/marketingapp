import sql from '@/lib/db'

const TIPOS = ['ari', 'fabricio'] as const
type Tipo = (typeof TIPOS)[number]

export async function GET() {
  const rows = await sql`SELECT tipo, context_text FROM context`
  const out: Record<Tipo, string> = { ari: '', fabricio: '' }
  for (const r of rows as { tipo: string | null; context_text: string }[]) {
    if (r.tipo === 'ari' || r.tipo === 'fabricio') out[r.tipo] = r.context_text ?? ''
  }
  return Response.json(out)
}

export async function PUT(req: Request) {
  const { tipo, context_text } = (await req.json()) as {
    tipo: string
    context_text: string
  }

  if (tipo !== 'ari' && tipo !== 'fabricio') {
    return Response.json({ error: 'Tipo inválido.' }, { status: 400 })
  }

  await sql`
    INSERT INTO context (tipo, context_text)
    VALUES (${tipo}, ${context_text})
    ON CONFLICT (tipo) DO UPDATE SET context_text = EXCLUDED.context_text
  `
  return Response.json({ ok: true })
}
