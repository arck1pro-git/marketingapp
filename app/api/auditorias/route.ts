import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, nome, prompt, created_at
    FROM auditoria
    ORDER BY created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  const { nome, prompt } = (await req.json()) as { nome: string; prompt: string }

  if (!nome?.trim() || !prompt?.trim()) {
    return Response.json({ error: 'Nome e prompt são obrigatórios.' }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO auditoria (nome, prompt)
    VALUES (${nome}, ${prompt})
    RETURNING id, nome, prompt, created_at
  `
  return Response.json(row, { status: 201 })
}
