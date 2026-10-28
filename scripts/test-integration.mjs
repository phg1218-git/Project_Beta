// 실제 PostgreSQL 동시성 테스트 실행기.
// 운영 데이터 보호: TEST_DATABASE_URL이 .env.local의 DATABASE_URL과 다른 별도 DB(예: Neon 브랜치)일 때만 실행한다.
// 사용: $env:TEST_DATABASE_URL="postgresql://...테스트용..."; npm run test:integration
// 처음 한 번은 테스트 DB에 스키마가 필요: npm run test:integration -- --push-schema
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const local = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}
const testUrl = process.env.TEST_DATABASE_URL
const hostDb = (value) => {
  const url = new URL(value)
  return `${url.hostname}${url.pathname}`
}

if (!testUrl) {
  console.error('TEST_DATABASE_URL이 없습니다. 운영과 분리된 테스트 DB 주소를 지정해주세요.')
  process.exit(1)
}
try {
  if (!['postgres:', 'postgresql:'].includes(new URL(testUrl).protocol)) throw new Error()
} catch {
  console.error('TEST_DATABASE_URL 형식을 확인해주세요.')
  process.exit(1)
}
if (local.DATABASE_URL && hostDb(local.DATABASE_URL) === hostDb(testUrl)) {
  console.error('TEST_DATABASE_URL이 .env.local의 DATABASE_URL과 같은 DB입니다. 운영 DB에서는 실행하지 않습니다.')
  process.exit(1)
}

const env = { ...process.env, DATABASE_URL: testUrl, DEV_DB_TEST_ALLOWED: 'true' }
const run = (args) => spawnSync(process.execPath, args, { env, stdio: 'inherit' }).status ?? 1

if (process.argv.includes('--push-schema')) {
  // 테스트 DB 전용. 운영 DB에는 절대 db push를 실행하지 않는다.
  const status = run([path.resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'])
  if (status !== 0) process.exit(status)
}
process.exit(run(['--test', 'tests/integration/postgres.test.mjs']))
