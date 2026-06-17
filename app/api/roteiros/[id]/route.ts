import sql from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { nome, texto, tipo } = (await req.json()) as {
    nome: string
    texto: string
    tipo?: string
  }

  if (!nome?.trim() || !texto?.trim()) {
    return Response.json({ error: 'Nome e texto são obrigatórios.' }, { status: 400 })
  }

  await sql`
    UPDATE roteiro
    SET nome = ${nome}, texto = ${texto}, tipo = ${tipo ?? null}
    WHERE id = ${parseInt(id, 10)}
  `
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await sql`DELETE FROM roteiro WHERE id = ${parseInt(id, 10)}`
  return Response.json({ ok: true })
}
