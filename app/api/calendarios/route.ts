import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT
      c.id, c.nome, c.mes, c.posicionamento, c.tipo, c.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', i.id, 'data', i.data, 'conteudo', i.conteudo, 'tipo', i.tipo,
            'roteiro_carrossel', i.roteiro_carrossel, 'roteiro_video', i.roteiro_video
          )
          ORDER BY i.data, i.id
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::json
      ) AS itens
    FROM calendario c
    LEFT JOIN calendario_item i ON i.calendario_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `
  return Response.json(rows)
}
