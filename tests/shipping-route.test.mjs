import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

const entry = {
  rowNumber: 2, orderId: 'order-1', itemId: 'item-1',
  carrier: 'CJ대한통운', trackingNumber: '001234567890',
}

function harness({ admin = true, status = 'PAYMENT_CONFIRMED', alreadyShipped = false } = {}) {
  let currentStatus = status
  let trackingNumber = alreadyShipped ? '999999999999' : null
  let shippedAt = alreadyShipped ? new Date() : null
  let audits = 0
  const prisma = {
    orderItem: {
      findMany: async () => [{
        id: entry.itemId, orderId: entry.orderId, carrier: trackingNumber ? 'CJ대한통운' : null,
        trackingNumber, shippedAt, order: { status: currentStatus },
      }],
      updateMany: async ({ where, data }) => {
        if (trackingNumber || where.orderId !== entry.orderId) return { count: 0 }
        trackingNumber = data.trackingNumber
        shippedAt = data.shippedAt
        return { count: 1 }
      },
    },
    order: {
      findUnique: async () => ({ status: currentStatus, updatedAt: new Date(0) }),
      updateMany: async ({ data }) => { currentStatus = data.status; return { count: 1 } },
    },
    $transaction: async (fn) => fn(prisma),
  }
  const loader = sourceLoader({
    '@/lib/admin-auth': { adminAuth: async () => admin ? { user: { id: 'admin' } } : null },
    '@/lib/prisma': { prisma },
    '@/lib/audit-log': { writeAuditLogTx: async () => { audits++ } },
    '@/lib/shipping-sheet': {
      MAX_SHIPPING_FILE_BYTES: 2 * 1024 * 1024,
      MAX_SHIPPING_ROWS: 1000,
      parseTrackingWorkbook: async () => [entry],
      buildShippingWorkbook: async () => Buffer.from('mock'),
    },
  })
  const route = loader('src/app/api/admin/shipping-sheet/route.ts')
  const post = (preview) => {
    const form = new FormData()
    form.set('file', new File(['mock'], 'shipping.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    return route.POST(new Request(`https://shop.example/api/admin/shipping-sheet${preview ? '?preview=1' : ''}`, {
      method: 'POST', body: form,
    }))
  }
  return { post, status: () => currentStatus, tracking: () => trackingNumber, audits: () => audits }
}

test('송장 업로드 미리보기는 DB를 바꾸지 않고 적용 시 배송중과 감사로그 기록', async () => {
  const h = harness()
  const preview = await h.post(true)
  assert.equal(preview.status, 200)
  assert.equal((await preview.json()).ready, 1)
  assert.equal(h.tracking(), null)
  assert.equal(h.audits(), 0)
  const applied = await h.post(false)
  assert.equal(applied.status, 200)
  assert.equal((await applied.json()).updated, 1)
  assert.equal(h.status(), 'SHIPPING')
  assert.equal(h.tracking(), entry.trackingNumber)
  assert.equal(h.audits(), 1)
})

test('비관리자·미입금 주문·기존 송장 덮어쓰기는 차단', async () => {
  assert.equal((await harness({ admin: false }).post(false)).status, 403)
  assert.equal((await harness({ status: 'DRAFT' }).post(false)).status, 409)
  const shipped = harness({ status: 'SHIPPING', alreadyShipped: true })
  assert.equal((await shipped.post(false)).status, 409)
  assert.equal(shipped.audits(), 0)
})
