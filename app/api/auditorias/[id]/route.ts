import sql from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { nome, prompt } = (await req.json()) as { nome: string; prompt: string }

  if (!nome?.trim() || !prompt?.trim()) {
    return Response.json({ error: 'Nome e prompt são obrigatórios.' }, { status: 400 })
  }

  await sql`
    UPDATE auditoria
    SET nome = ${nome}, prompt = ${prompt}
    WHERE id = ${parseInt(id, 10)}
  `
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await sql`DELETE FROM auditoria WHERE id = ${parseInt(id, 10)}`
  return Response.json({ ok: true })
}
