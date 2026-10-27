import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'
import { renderToStaticMarkup } from 'react-dom/server'

const load = sourceLoader()
const { defaultStoreSettings, parseStoreSettings } = load('src/lib/store-settings-data.ts')

test('인증 정보가 없는 초기 설정은 GAP 표시를 끈 상태', () => {
  assert.equal(defaultStoreSettings.gapCertified, false)
  assert.equal(defaultStoreSettings.gapCertification, '')
  assert.throws(() => parseStoreSettings({ ...defaultStoreSettings, gapCertified: true }))
  assert.equal(parseStoreSettings({ ...defaultStoreSettings, gapCertified: true, gapCertification: '확인한 인증 내용' }).gapCertified, true)
})

test('잘못된 배송비·전화번호·농장명은 거부', () => {
  for (const shippingFee of [-1, 1.5, 1000001, '3000']) {
    assert.throws(() => parseStoreSettings({ ...defaultStoreSettings, shippingFee }))
  }
  assert.throws(() => parseStoreSettings({ ...defaultStoreSettings, contactPhone: 'javascript:alert(1)' }))
  assert.throws(() => parseStoreSettings({ ...defaultStoreSettings, farmName: '   ' }))
})

function settingsHarness(admin = true) {
  let row = null
  let logs = 0
  const prisma = {
    storeSettings: {
      findUnique: async () => row,
      create: async ({ data }) => { row = structuredClone(data) },
      updateMany: async ({ where, data }) => {
        if (!row || row.version !== where.version) return { count: 0 }
        row.data = data.data
        row.version++
        return { count: 1 }
      },
    },
    $transaction: async (fn) => fn(prisma),
  }
  const loader = sourceLoader({
    '@/lib/admin-auth': { adminAuth: async () => admin ? { user: { id: 'admin' } } : null },
    '@/lib/prisma': { prisma },
    '@/lib/audit-log': { writeAuditLogTx: async () => { logs++ } },
  })
  const routes = loader('src/app/api/admin/settings/route.ts')
  const put = (version, data = defaultStoreSettings) => routes.PUT(new Request('https://shop.example/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, version }),
  }))
  return { put, get: routes.GET, logs: () => logs }
}

test('관리자가 저장한 설정은 다시 조회되고 오래된 버전의 덮어쓰기를 차단', async () => {
  const h = settingsHarness()
  assert.equal((await (await h.get()).json()).version, 0)
  assert.equal((await h.put(0, { ...defaultStoreSettings, farmName: '우리 농장' })).status, 200)
  assert.equal((await h.put(1, { ...defaultStoreSettings, shippingFee: 3000 })).status, 200)
  assert.equal((await h.put(1)).status, 409)
  const saved = await (await h.get()).json()
  assert.equal(saved.data.shippingFee, 3000)
  assert.equal(saved.version, 2)
  assert.equal(h.logs(), 2)
})

test('일반 사용자는 설정 조회/저장 모두 거부', async () => {
  const h = settingsHarness(false)
  assert.equal((await h.get()).status, 403)
  assert.equal((await h.put(0)).status, 403)
  assert.equal(h.logs(), 0)
})

test('홈은 미확인 인증을 숨기고 관리자 입력을 HTML로 실행하지 않음', async () => {
  const loader = sourceLoader({
    '@/lib/store-settings': { getStoreSettings: async () => ({
      ...defaultStoreSettings, introduction: '<script>alert(1)</script>', gapCertification: '미확인 정보',
    }) },
  })
  const Home = loader('src/app/page.tsx').default
  const html = renderToStaticMarkup(await Home())
  assert.ok(!html.includes('GAP 인증'))
  assert.ok(!html.includes('미확인 정보'))
  assert.ok(!html.includes('<script>alert(1)</script>'))
  assert.ok(html.includes('&lt;script&gt;'))
})
