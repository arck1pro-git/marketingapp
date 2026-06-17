import sql from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { roteiro_carrossel, roteiro_video } = (await req.json()) as {
    roteiro_carrossel: string
    roteiro_video: string
  }

  await sql`
    UPDATE calendario_item
    SET roteiro_carrossel = ${roteiro_carrossel ?? ''}, roteiro_video = ${roteiro_video ?? ''}
    WHERE id = ${parseInt(id, 10)}
  `
  return Response.json({ ok: true })
}
