import { getStore } from '@netlify/blobs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { IMAGE_KEY } from './product-image'

// Plain next dev uses a local sandbox; deployed functions always use persistent Blobs.
const local = () => process.env.NODE_ENV === 'development' && !process.env.NETLIFY
const directory = () => path.join(process.cwd(), '.local', 'product-images')
function store() {
  const context = process.env.CONTEXT || 'production'
  return getStore({ name: context === 'production' ? 'product-images' : `product-images-${context}`, consistency: 'strong' })
}
export async function saveImage(key: string, data: Buffer) {
  if (!IMAGE_KEY.test(key)) throw new Error('Invalid image key')
  if (local()) {
    await mkdir(directory(), { recursive: true })
    await writeFile(path.join(directory(), key), data, { flag: 'wx' })
  } else {
    await store().set(key, new Uint8Array(data).buffer, { onlyIfNew: true })
  }
}
export async function readImage(key: string): Promise<ArrayBuffer | null> {
  if (!IMAGE_KEY.test(key)) return null
  if (!local()) return store().get(key, { type: 'arrayBuffer' })
  try { return new Uint8Array(await readFile(path.join(directory(), key))).buffer }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
