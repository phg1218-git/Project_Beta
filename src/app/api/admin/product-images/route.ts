import { adminAuth } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { saveImage } from '@/lib/image-storage'
import { MAX_IMAGE_BYTES, validateImageFile } from '@/lib/product-image'

export const runtime = 'nodejs'
export async function POST(req: Request) {
  if ((await adminAuth())?.user?.role !== 'ADMIN') return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  if (Number(req.headers.get('content-length')) > MAX_IMAGE_BYTES + 65536) return NextResponse.json({ error: '사진 용량은 3MB 이하여야 합니다.' }, { status: 413 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: '사진을 선택해주세요.' }, { status: 400 })
  const error = validateImageFile(file)
  if (error) return NextResponse.json({ error }, { status: 400 })
  let image: Buffer
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(input, { limitInputPixels: 25000000 }).metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('Unsupported image')
    image = await sharp(input, { limitInputPixels: 25000000 }).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
  } catch {
    return NextResponse.json({ error: '사진을 읽을 수 없습니다. 정상적인 JPG, PNG, WebP 파일을 선택해주세요.' }, { status: 400 })
  }
  try {
    const key = `${randomUUID()}.webp`
    await saveImage(key, image)
    return NextResponse.json({ imageUrl: `/api/product-images/${key}` }, { status: 201 })
  } catch (error) {
    console.error('[ProductImage] 저장 실패', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: '사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 503 })
  }
}
