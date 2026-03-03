import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getOrders(userId: string) {
  try {
    return await prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

export default async function OrdersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const orders = await getOrders(session.user.id)

  return (
    <div className="page-enter">
      <div className="px-4 py-5 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">📦 주문 내역</h1>
        <p className="text-sm text-gray-500 mt-1">최근 주문을 확인하세요</p>
      </div>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500">
              아직 주문 내역이 없어요.<br />첫 주문을 해보세요!
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm p-4 mb-3"
            >
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {order.items.map((item) => (
                  <p key={item.id}>
                    {item.product.name} × {item.quantity}
                  </p>
                ))}
              </div>
              <p className="text-lg font-bold text-orange-500">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
