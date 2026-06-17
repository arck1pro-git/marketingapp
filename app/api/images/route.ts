import { readdirSync } from 'fs'
import { join } from 'path'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export async function GET() {
  const publicDir = join(process.cwd(), 'public')

  try {
    const files = readdirSync(publicDir)
    const images = files
      .filter((f) => {
        const dot = f.lastIndexOf('.')
        if (dot === -1) return false
        const ext = f.slice(dot).toLowerCase()
        return IMAGE_EXTS.has(ext) && !f.startsWith('.')
      })
      .slice(0, 6)
      .map((f) => '/' + encodeURIComponent(f))

    return Response.json({ images })
  } catch {
    return Response.json({ images: [] })
  }
}
