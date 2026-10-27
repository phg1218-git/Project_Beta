import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

// 사용자 요청: 로컬 앱에서도 기존 .env의 Neon DB를 사용한다.
// 별도 개발 브랜치는 필수가 아니며 이 실행기는 배포 명령을 제공하지 않는다.
const base = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {}
const env = { ...process.env, ...base }
try {
  const url = new URL(env.DATABASE_URL)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
} catch {
  console.error('.env의 PostgreSQL DATABASE_URL을 확인해주세요.')
  process.exit(1)
}

const action = process.argv[2]
const args = process.argv.slice(3)
let command
if (action === 'check') {
  console.log('.env 기반 로컬 실행 설정 확인 완료. 연결 주소와 비밀번호는 출력하지 않습니다.')
  process.exit(0)
} else if (action === 'apply') {
  command = ['node_modules/prisma/build/index.js', 'db', 'execute', '--file', 'prisma/patches/20261027_store_settings.sql', '--schema', 'prisma/schema.prisma']
} else if (action === 'test') {
  command = ['--test', 'tests/integration/postgres.test.mjs']
  env.DEV_DB_TEST_ALLOWED = 'true'
} else if (action === 'build') {
  command = ['node_modules/next/dist/bin/next', 'build']
} else if (action === 'start') {
  command = ['node_modules/next/dist/bin/next', 'start', ...args]
} else {
  console.error('사용법: node scripts/development.mjs check|apply|test|build|start')
  process.exit(1)
}
const result = spawnSync(process.execPath, command.map((arg, i) => i === 0 && arg.startsWith('node_modules/') ? path.resolve(arg) : arg), { env, stdio: 'inherit' })
process.exit(result.status ?? 1)
