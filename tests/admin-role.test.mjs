import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceLoader } from './load-source.mjs'

test('최고관리자 이메일은 대소문자·공백과 관계없이 서버 환경변수에서 판정', () => {
  const previous = process.env.ADMIN_EMAILS
  try {
    process.env.ADMIN_EMAILS = ' Owner@Example.com ,other@example.com '
    const { isSuperAdminEmail } = sourceLoader()('src/lib/admin-roles.ts')
    assert.equal(isSuperAdminEmail('owner@example.com'), true)
    assert.equal(isSuperAdminEmail(' OTHER@EXAMPLE.COM '), true)
    assert.equal(isSuperAdminEmail('member@example.com'), false)
    assert.equal(isSuperAdminEmail(null), false)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = previous
  }
})

test('서버는 DB 역할을 재검증하고 환경변수 최고관리자만 별도 판정', async () => {
  const previous = process.env.ADMIN_EMAILS
  try {
    process.env.ADMIN_EMAILS = 'owner@example.com'
    const session = { user: { id: 'owner', role: 'USER' } }
    const loader = sourceLoader({
      '@/auth': { auth: async () => session },
      '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ role: 'USER', email: 'owner@example.com' }) } } },
    })
    const result = await loader('src/lib/admin-auth.ts').superAdminAuth()
    assert.equal(result?.user.role, 'ADMIN')
    assert.equal(result?.user.isSuperAdmin, true)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = previous
  }
})

function harness({ superAdmin = true, targetRole = 'USER', targetEmail = 'member@example.com', updateCount = 1 } = {}) {
  let role = targetRole
  let auditCount = 0
  const target = { id: 'member', email: targetEmail, role }
  const prisma = {
    user: {
      findUnique: async () => ({ ...target, role }),
      updateMany: async ({ data }) => {
        if (updateCount !== 1) return { count: 0 }
        role = data.role
        return { count: 1 }
      },
    },
    $transaction: async (fn) => fn(prisma),
  }
  const loader = sourceLoader({
    '@/lib/admin-auth': { superAdminAuth: async () => superAdmin ? { user: { id: 'owner' } } : null },
    '@/lib/prisma': { prisma },
    '@/lib/admin-roles': { isSuperAdminEmail: (email) => email === 'owner@example.com' },
    '@/lib/audit-log': { writeAuditLogTx: async () => { auditCount++ } },
  })
  const route = loader('src/app/api/admin/members/[id]/role/route.ts')
  const patch = (nextRole, id = 'member') => route.PATCH(
    new Request('https://shop.example/api/admin/members/member/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    }),
    { params: Promise.resolve({ id }) },
  )
  return { patch, role: () => role, audits: () => auditCount }
}

test('일반 관리자는 권한을 변경할 수 없고 최고관리자 계정도 변경할 수 없음', async () => {
  const ordinary = harness({ superAdmin: false })
  assert.equal((await ordinary.patch('ADMIN')).status, 403)
  assert.equal(ordinary.role(), 'USER')
  const protectedUser = harness({ targetEmail: 'owner@example.com' })
  assert.equal((await protectedUser.patch('ADMIN')).status, 403)
  assert.equal((await protectedUser.patch('USER', 'owner')).status, 409)
  assert.equal(protectedUser.audits(), 0)
})

test('최고관리자는 관리자를 지정·해제하고 변경 이력을 한 번씩 기록', async () => {
  const h = harness()
  assert.equal((await h.patch('ADMIN')).status, 200)
  assert.equal(h.role(), 'ADMIN')
  assert.equal((await h.patch('ADMIN')).status, 200)
  assert.equal(h.audits(), 1)
  assert.equal((await h.patch('USER')).status, 200)
  assert.equal(h.role(), 'USER')
  assert.equal(h.audits(), 2)
})

test('잘못된 역할과 동시 변경 충돌은 DB 및 감사 기록을 남기지 않음', async () => {
  const h = harness({ updateCount: 0 })
  assert.equal((await h.patch('SUPER_ADMIN')).status, 400)
  assert.equal((await h.patch('ADMIN')).status, 409)
  assert.equal(h.role(), 'USER')
  assert.equal(h.audits(), 0)
})
