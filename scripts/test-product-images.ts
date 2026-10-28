import assert from 'node:assert/strict'
import sharp from 'sharp'
import { encode } from 'next-auth/jwt'
import { loadEnvConfig } from '@next/env'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { isProductImageUrl, validateImageFile } from '../src/lib/product-image'

// Run only against our local next dev server. No product or content records are changed.
async function main() {
  loadEnvConfig(process.cwd())
  const origin = 'http://localhost:3100'
  const cookieName = 'authjs.session-token'
  async function cookie(role: string) {
    return `${cookieName}=${await encode({ secret: process.env.AUTH_SECRET!, salt: cookieName, token: { id: 'local-upload-test', role, profileComplete: true }, maxAge: 120 })}`
  }
  const admin = await cookie('ADMIN')
  const user = await cookie('USER')
  const png = await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#ff8800' } }).png().toBuffer()
  async function upload(auth?: string, bytes: Buffer = png, type = 'image/png') {
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(bytes)], { type }), 'sample.png')
    return fetch(`${origin}/api/admin/product-images`, { method: 'POST', headers: auth ? { cookie: auth } : {}, body: form })
  }
  assert.equal((await upload()).status, 403)
  assert.equal((await upload(user)).status, 403)
  assert.equal((await upload(admin, Buffer.from('<svg/>'), 'image/svg+xml')).status, 400)
  assert.equal((await upload(admin, Buffer.from('fake png'))).status, 400)
  assert.ok(validateImageFile({ size: 3 * 1024 * 1024 + 1, type: 'image/png' }))
  assert.equal(isProductImageUrl('https://example.com/image.png'), false)
  const response = await upload(admin)
  assert.equal(response.status, 201, await response.clone().text())
  const { imageUrl } = await response.json()
  assert.ok(isProductImageUrl(imageUrl))
  assert.ok(typeof imageUrl === 'string')
  try {
    const downloaded = await fetch(origin + imageUrl)
    assert.equal(downloaded.status, 200)
    assert.equal(downloaded.headers.get('content-type'), 'image/webp')
    const metadata = await sharp(Buffer.from(await downloaded.arrayBuffer())).metadata()
    assert.equal(metadata.width, 1600)
    assert.equal(metadata.height, 800)
    assert.equal(metadata.format, 'webp')
    assert.equal((await fetch(`${origin}/api/admin/content`)).status, 403)
    assert.equal((await fetch(`${origin}/api/admin/content`, { headers: { cookie: admin } })).status, 200)
    for (const route of ['/about', '/faq', '/privacy']) assert.equal((await fetch(origin + route, { redirect: 'manual' })).status, 200)
    console.log('PASS: upload permissions, file validation, WebP conversion, resize, public read, content permissions, public pages')
  } finally {
    await unlink(path.join(process.cwd(), '.local', 'product-images', path.basename(imageUrl)))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
