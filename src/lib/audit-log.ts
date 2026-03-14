/**
 * 관리자 액션 로그 적재 헬퍼
 * prisma generate 이전에도 빌드가 깨지지 않도록 type-cast 를 이 파일에 격리합니다.
 * db:generate 후 AdminActionLog 타입이 생기면 as any 제거 가능합니다.
 */
import { prisma } from '@/lib/prisma'

interface AuditLogParams {
  adminId: string
  action: string      // 'confirm-payment' | 'ship' | 'delivered' | 'expire'
  targetType: string  // 'order' | 'bulk'
  targetId: string
  before?: unknown
  after?: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.adminActionLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        beforeJson: params.before !== undefined ? JSON.stringify(params.before) : null,
        afterJson: params.after !== undefined ? JSON.stringify(params.after) : null,
      },
    })
  } catch {
    // 로그 실패가 메인 플로우를 막지 않도록 무시
    console.warn('[audit-log] 로그 적재 실패 (db:generate 후 재시도)')
  }
}

export async function writeAuditLogTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  params: AuditLogParams,
): Promise<void> {
  await tx.adminActionLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      beforeJson: params.before !== undefined ? JSON.stringify(params.before) : null,
      afterJson: params.after !== undefined ? JSON.stringify(params.after) : null,
    },
  })
}
