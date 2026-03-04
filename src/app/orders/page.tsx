import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier) {
    case 'CJ대한통운':
      return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${trackingNumber}`
    case '한진택배':
      return `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${trackingNumber}`
    case '롯데택배':
      return `https://www.lotteglogis.com/home/reservation/tracking/index?invNo=${trackingNumber}`
    case '우체국택배':
      return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNumber}`
    case '로젠택배':
      return `https://www.ilogen.com/web/personal/trace/${trackingNumber}`
    default:
      return ''
  }
}

// 환경변수에서 계좌 정보 가져오기
const BANK_ACCOUNT_INFO = process.env.BANK_ACCOUNT_INFO || ''

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
    <div className="page-enter pb-24">
      {/* 페이지 헤더 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">📦 주문 내역</h1>
        <p className="text-sm text-gray-500 mt-1">최근 주문을 확인하세요</p>
      </div>

      {/* 계좌 정보 안내 - 중앙 정렬, 눈에 띄게 */}
      <div className="px-4 py-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
          <p className="text-center text-xs text-orange-600 font-semibold mb-1">
            💳 입금 계좌 안내
          </p>
          <p className="text-center text-base font-bold text-gray-900">
            {BANK_ACCOUNT_INFO}
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            예금주: 오늘의귤
          </p>
        </div>
      </div>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500">
              아직 주문 내역이 없어요.<br />첫 주문을 해보세요!
            </p>
            <Link
              href="/products"
              className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white font-semibold rounded-full"
            >
              상품 보러가기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* 주문 헤더 */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      주문번호: {order.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* 주문 상품 */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                      🍊
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {order.items[0]?.product.name}
                        {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                      </p>
                      <p className="text-lg font-bold text-orange-500 mt-0.5">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 주문 상태별 안내 메시지 */}
                {order.status === 'DRAFT' && (
                  <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
                    <p className="text-xs text-yellow-700 text-center">
                      💡 입금 후 &quot;입금확인 요청&quot; 버튼을 눌러주세요
                    </p>
                  </div>
                )}
                {order.status === 'DEPOSIT_REQUESTED' && (
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
                    <p className="text-xs text-blue-700 text-center">
                      ⏳ 입금 확인 중입니다. 잠시만 기다려주세요.
                    </p>
                  </div>
                )}
                {order.status === 'PAYMENT_CONFIRMED' && (
                  <div className="px-4 py-2 bg-green-50 border-t border-green-100">
                    <p className="text-xs text-green-700 text-center">
                      ✅ 입금이 확인되었습니다. 배송 준비 중입니다.
                    </p>
                  </div>
                )}
                {(order.status === 'SHIPPING' || order.status === 'DELIVERED') &&
                  order.items[0]?.carrier && order.items[0]?.trackingNumber && (
                  <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                    <p className="text-xs text-blue-600 font-semibold mb-1">
                      {order.status === 'SHIPPING' ? '🚚 배송 중' : '✅ 배송 완료'}
                    </p>
                    <p className="text-xs text-gray-700">
                      택배사: {order.items[0].carrier}
                    </p>
                    <p className="text-xs text-gray-700 font-mono mt-0.5">
                      송장번호: {order.items[0].trackingNumber}
                    </p>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex-1 py-2.5 text-center text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    상세보기
                  </Link>

                  {/* DRAFT 상태: 입금확인 요청 버튼 */}
                  {order.status === 'DRAFT' && (
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors"
                    >
                      입금확인 요청
                    </Link>
                  )}

                  {/* SHIPPING, DELIVERED 상태: 배송추적 버튼 */}
                  {(['SHIPPING', 'DELIVERED'] as const).includes(order.status as 'SHIPPING' | 'DELIVERED') &&
                    order.items[0]?.carrier && order.items[0]?.trackingNumber && (() => {
                      const url = getTrackingUrl(order.items[0].carrier!, order.items[0].trackingNumber!)
                      return url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
                        >
                          배송추적
                        </a>
                      ) : null
                    })()
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}