import sql from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await sql`DELETE FROM carousel WHERE id = ${parseInt(id, 10)}`
  return Response.json({ ok: true })
}
