import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, nome, texto, tipo, created_at
    FROM roteiro
    ORDER BY created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  const { nome, texto, tipo } = (await req.json()) as {
    nome: string
    texto: string
    tipo?: string
  }

  if (!nome?.trim() || !texto?.trim()) {
    return Response.json({ error: 'Nome e texto são obrigatórios.' }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO roteiro (nome, texto, tipo)
    VALUES (${nome}, ${texto}, ${tipo ?? null})
    RETURNING id, nome, texto, tipo, created_at
  `
  return Response.json(row, { status: 201 })
}
