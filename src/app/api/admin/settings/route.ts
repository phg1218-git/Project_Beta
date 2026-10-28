import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { defaultStoreSettings, parseStoreSettings } from '@/lib/store-settings-data'
import { writeAuditLogTx } from '@/lib/audit-log'

export async function GET() {
  try {
    if (!await adminAuth()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    const row = await prisma.storeSettings.findUnique({ where: { id: 'main' } })
    return NextResponse.json({ data: row ? parseStoreSettings(row.data) : defaultStoreSettings, version: row?.version ?? 0 })
  } catch {
    return NextResponse.json({ error: '설정을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.' }, { status: 503 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await adminAuth()
    if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    let data
    let version: number
    try {
      const body = await req.json()
      data = parseStoreSettings(body?.data)
      version = body?.version
      if (!Number.isSafeInteger(version) || version < 0) throw new Error('설정을 다시 불러온 후 저장해주세요.')
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '입력 내용을 확인해주세요.' }, { status: 400 })
    }
    const saved = await prisma.$transaction(async (tx) => {
      if (version === 0) {
        await tx.storeSettings.create({ data: { id: 'main', data, version: 1 } })
      } else {
        const result = await tx.storeSettings.updateMany({
          where: { id: 'main', version }, data: { data, version: { increment: 1 } },
        })
        if (result.count !== 1) throw new Error('SETTINGS_CONFLICT')
      }
      // 정책 전문·계좌·연락처를 감사 로그에 중복 저장하지 않는다.
      await writeAuditLogTx(tx, {
        adminId: session.user.id, action: 'update-settings', targetType: 'settings', targetId: 'main',
        before: { version }, after: { version: version + 1 },
      })
      return { data, version: version + 1 }
    })
    return NextResponse.json(saved)
  } catch (error) {
    if ((error instanceof Error && error.message === 'SETTINGS_CONFLICT') ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
      return NextResponse.json({ error: '다른 관리자가 먼저 수정했습니다. 현재 입력을 보관한 뒤 새로고침해주세요.' }, { status: 409 })
    }
    return NextResponse.json({ error: '설정을 저장하지 못했습니다. 입력 내용은 유지됩니다.' }, { status: 503 })
  }
}
