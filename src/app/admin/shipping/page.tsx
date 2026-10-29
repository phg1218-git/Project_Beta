import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { ShippingWorkbookManager } from '@/components/ShippingWorkbookManager'

export const dynamic = 'force-dynamic'

export default async function AdminShippingPage() {
  if (!await adminAuth()) redirect('/')
  const pendingCount = await prisma.orderItem.count({
    where: { shippedAt: null, order: { status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING'] } } },
  })
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">📦 배송 작업</h1>
      <p className="text-sm text-gray-600 mb-6">미발송 목록을 엑셀로 받고, CJ 운송장번호를 한 번에 등록합니다.</p>
      <ShippingWorkbookManager pendingCount={pendingCount} />
    </div>
  )
}
