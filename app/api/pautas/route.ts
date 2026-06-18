import { FEEDS, fetchFeedItems, type NewsItem } from '@/app/lib/news'

export async function GET() {
  const keys = Object.keys(FEEDS)
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
