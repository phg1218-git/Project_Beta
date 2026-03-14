import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatPrice, formatPhoneNumber } from '@/lib/utils'
import { OrderActions } from '@/components/OrderActions'
import { ShippingInfo } from '@/components/ShippingInfo'

export const dynamic = 'force-dynamic'

// 환경변수에서 계좌 정보 가져오기
const BANK_ACCOUNT_INFO = process.env.BANK_ACCOUNT_INFO || '농협 000-0000-0000-00 (오늘의귤)'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getOrder(orderId: string, userId: string) {
  try {
    return await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: { product: true },
        },
        paymentRequest: true,
      },
    })
  } catch {
    return null
  }
}

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const order = await getOrder(id, session.user.id)

  if (!order) {
    notFound()
  }

  const canRequestDeposit = order.status === 'DRAFT'
  const canCancel = order.status === 'DRAFT'
  const canViewShipping = ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(order.status)

  return (
    <div className="page-enter pb-24">
      {/* 페이지 헤더 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">📦 주문 상세</h1>
        <p className="text-sm text-gray-500 mt-1">
          주문번호: {order.id.slice(-8).toUpperCase()}
        </p>
      </div>

      {/* 계좌 정보 안내 - DRAFT 상태일 때만 표시 */}
      {order.status === 'DRAFT' && (
        <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-orange-100">
            <p className="text-center text-xs text-orange-600 font-semibold mb-1">
              💳 입금 계좌
            </p>
            <p className="text-center text-sm font-bold text-gray-900">
              {BANK_ACCOUNT_INFO}
            </p>
          </div>
        </div>
      )}

      {/* 주문 상태 */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">주문 상태</p>
            <div className="mt-1">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">주문일시</p>
            <p className="text-sm font-medium">
              {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* 상태별 안내 메시지 */}
        <div className="mt-3">
          {order.status === 'DRAFT' && (
            <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-sm text-yellow-800">
                💡 위 계좌로 <strong>{formatPrice(order.totalAmount)}</strong>을 입금한 후, 
                아래 &quot;입금확인 요청&quot; 버튼을 눌러주세요.
              </p>
            </div>
          )}
          {order.status === 'DEPOSIT_REQUESTED' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800">
                ⏳ 입금 확인 요청이 완료되었습니다. 관리자 확인 후 배송이 시작됩니다.
              </p>
            </div>
          )}
          {order.status === 'PAYMENT_CONFIRMED' && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-800">
                ✅ 입금이 확인되었습니다. 배송 준비 중입니다.
              </p>
            </div>
          )}
          {order.status === 'SHIPPING' && (
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-sm text-orange-800">
                🚚 배송이 시작되었습니다. 아래에서 배송 정보를 확인하세요.
              </p>
            </div>
          )}
          {order.status === 'DELIVERED' && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-800">
                🎉 배송이 완료되었습니다. 감사합니다!
              </p>
            </div>
          )}
          {order.status === 'CANCELED' && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-800">
                ❌ 취소된 주문입니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 배송 정보 - 결제 확인 후 표시 */}
      {canViewShipping && (
        <div className="px-4 py-4">
          <h2 className="font-bold text-gray-900 mb-3">🚚 배송 정보</h2>
          <ShippingInfo orderId={order.id} orderItems={order.items} />
        </div>
      )}

      {/* 주문 상품 */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-gray-900 mb-3">주문 상품</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {order.items.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 flex gap-3 ${
                index < order.items.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                🍊
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{item.product.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatPrice(item.unitPrice)} × {item.quantity}개
                </p>
                <p className="text-orange-500 font-bold mt-1">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 수령인 정보 */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-gray-900 mb-3">수령인 정보</h2>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {order.items[0] && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">
                  {order.items[0].recipientName}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {formatPhoneNumber(order.items[0].recipientPhone)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {order.items[0].recipientAddressBase}
                {order.items[0].recipientAddressDetail && `, ${order.items[0].recipientAddressDetail}`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* 결제 정보 */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-gray-900 mb-3">결제 정보</h2>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">상품 금액</span>
            <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">배송비</span>
            <span className="font-semibold text-green-600">무료</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="font-bold text-gray-900">총 결제금액</span>
            <span className="text-xl font-bold text-orange-500">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 액션 버튼 - DRAFT 상태일 때만 표시 */}
      <OrderActions 
        orderId={order.id} 
        status={order.status}
        canRequestDeposit={canRequestDeposit}
        canCancel={canCancel}
      />
    </div>
  )
}