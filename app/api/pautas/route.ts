import { QUERIES, fetchFeedItems, type NewsItem } from '@/app/lib/news'

export async function GET() {
  const keys = Object.keys(QUERIES)

  // fetchFeedItems já serializa as chamadas reais à GNews (throttle interno) e
  // usa cache, então pode ser disparado em paralelo sem estourar o rate limit.
  const entries = await Promise.allSettled(
    keys.map(async (key) => [key, await fetchFeedItems(key)] as const)
  )

  const data: Record<string, NewsItem[]> = {}
  for (const r of entries) {
    if (r.status === 'fulfilled') {
      const [key, items] = r.value
      data[key] = items
    }
  }

  return Response.json(data)
}
