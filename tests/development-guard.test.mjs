import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const script = path.resolve('scripts/development.mjs')
test('로컬 명령은 .env를 사용하고 연결정보 누락·잘못된 프로토콜을 차단', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'citrus-dev-guard-'))
  const base = path.join(directory, '.env')
  const dev = path.join(directory, '.env.development.local')
  t.after(() => {
    for (const file of [base, dev]) { try { unlinkSync(file) } catch (error) { if (error.code !== 'ENOENT') throw error } }
    rmdirSync(directory)
  })
  const run = () => spawnSync(process.execPath, [script, 'check'], {
    cwd: directory, encoding: 'utf8', env: { ...process.env, DATABASE_URL: '' },
  })
  assert.equal(run().status, 1)
  writeFileSync(base, 'DATABASE_URL="postgresql://user:secret@ep-example.neon.tech/neondb"')
  writeFileSync(dev, 'DATABASE_URL="postgresql://other:different@ep-example-pooler.neon.tech/neondb?schema=test"')
  assert.equal(run().status, 0)
  writeFileSync(dev, 'DATABASE_URL="postgresql://user:secret@ep-development.neon.tech/neondb"')
  const result = run()
  assert.equal(result.status, 0)
  assert.ok(!result.stdout.includes('secret'))
  assert.ok(!result.stdout.includes('ep-development'))
  writeFileSync(base, 'DATABASE_URL="https://example.com"')
  assert.equal(run().status, 1)
})
