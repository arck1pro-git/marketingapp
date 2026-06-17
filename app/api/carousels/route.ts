import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT
      c.id,
      c.title,
      c.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'slide_order', s.slide_order,
            'body', s.body,
            'image_url', s.image_url
          ) ORDER BY s.slide_order
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
      ) AS slides
    FROM carousel c
    LEFT JOIN slide s ON s.carousel_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  const { title, slides, images } = await req.json()

  const ctxRows = await sql`SELECT id FROM context ORDER BY id LIMIT 1`
  const contextId = (ctxRows[0] as { id: number } | undefined)?.id ?? null

  const [row] = await sql`
    INSERT INTO carousel (context_id, title)
    VALUES (${contextId}, ${title})
    RETURNING id
  `
  const carouselId = (row as { id: number }).id

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const imageUrl: string = (images as string[])[i % Math.max((images as string[]).length, 1)] ?? ''
    const body = JSON.stringify({ titulo: slide.titulo ?? '', texto: slide.texto })

    await sql`
      INSERT INTO slide (carousel_id, slide_order, body, image_url)
      VALUES (${carouselId}, ${slide.slide}, ${body}, ${imageUrl})
    `
  }

  return Response.json({ id: carouselId }, { status: 201 })
}
