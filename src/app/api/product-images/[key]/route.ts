import { readImage } from '@/lib/image-storage'
export const runtime = 'nodejs'
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const data = await readImage((await params).key)
    if (!data) return new Response('Not found', { status: 404 })
    return new Response(data, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new Response('Image temporarily unavailable', { status: 503 }) }
}
