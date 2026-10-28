import assert from 'node:assert/strict'
import { encode } from 'next-auth/jwt'
import { loadEnvConfig } from '@next/env'

async function main() {
  loadEnvConfig(process.cwd())
  const origin = 'http://localhost:3100'
  for (const role of ['USER', 'ADMIN']) {
    const cookie = `authjs.session-token=${await encode({ secret: process.env.AUTH_SECRET!, salt: 'authjs.session-token', token: { id: 'profile-validation-test', role, profileComplete: false }, maxAge: 120 })}`
    for (const pathname of ['/products', '/profile/edit', '/admin']) {
      const response = await fetch(origin + pathname, { headers: { cookie }, redirect: 'manual' })
      assert.equal(response.status, 307)
      assert.equal(new URL(response.headers.get('location')!).pathname, '/profile/setup')
    }
    for (const [endpoint, method] of [['setup', 'POST'], ['edit', 'PATCH']]) {
      for (const body of [{ name: 'John', phone: '010-1234-5678' }, { name: '홍길동', phone: '011-1234-5678' }, { name: '홍길동', phone: '010-12ab-5678' }, { name: 123, phone: null }]) {
        const response = await fetch(`${origin}/api/profile/${endpoint}`, { method, headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        assert.equal(response.status, 400, await response.clone().text())
      }
    }
  }
  console.log('PASS: incomplete USER/ADMIN redirect, setup/edit reject invalid names and numbers before DB write')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
