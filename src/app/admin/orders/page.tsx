'use client'

import { useState, useEffect } from 'react'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'

type OrderStatus = 'DRAFT' | 'DEPOSIT_REQUESTED' | 'PAYMENT_CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELED'

interface OrderItem {
  id: string
  product: { name: string }
  quantity: number
  carrier?: string | null
  trackingNumber?: string | null
}

interface Order {
  id: string
  createdAt: string
  user: { name: string | null; email: string | null }
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
}

const STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: '전체', value: 'ALL' },
  { label: '입금요청 전', value: 'DRAFT' },
  { label: '입금확인 요청', value: 'DEPOSIT_REQUESTED' },
  { label: '배송 준비', value: 'PAYMENT_CONFIRMED' },
  { label: '배송 중', value: 'SHIPPING' },
  { label: '배송 완료', value: 'DELIVERED' },
]

const CARRIERS = [
  'CJ대한통운',
  '한진택배',
  '롯데택배',
  '우체국택배',
  '로젠택배',
]

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [shippingModal, setShippingModal] = useState<{ orderId: string } | null>(null)
  const [shippingForm, setShippingForm] = useState({ carrier: CARRIERS[0], trackingNumber: '' })
  const [shippingLoading, setShippingLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('주문 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = activeTab === 'ALL'
    ? orders
    : orders.filter((o) => o.status === activeTab)

  const selectableIds = filtered
    .filter((o) => o.status === 'DEPOSIT_REQUESTED')
    .map((o) => o.id)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleConfirmPayment = async () => {
    if (selectedIds.length === 0) {
      alert('선택된 주문이 없습니다.')
      return
    }
    if (!confirm(`${selectedIds.length}건의 입금을 확인 처리할까요?`)) return

    try {
      await fetch('/api/admin/orders/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds }),
      })
      await fetchOrders()
      setSelectedIds([])
      alert('입금 확인 처리 완료')
    } catch (error) {
      console.error('입금 확인 실패:', error)
    }
  }

  const handleCompleteDelivery = async (orderId: string) => {
    if (!confirm('배송완료로 처리할까요?')) return
    try {
      const res = await fetch('/api/admin/orders/complete-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '처리 중 오류가 발생했습니다.')
        return
      }
      await fetchOrders()
      alert('배송완료 처리 완료')
    } catch (error) {
      console.error('배송완료 처리 실패:', error)
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const openShippingModal = (orderId: string) => {
    setShippingForm({ carrier: CARRIERS[0], trackingNumber: '' })
    setShippingModal({ orderId })
  }

  const handleRegisterShipping = async () => {
    if (!shippingModal) return
    if (!shippingForm.trackingNumber.trim()) {
      alert('송장번호를 입력해주세요.')
      return
    }

    setShippingLoading(true)
    try {
      const res = await fetch('/api/admin/orders/register-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: shippingModal.orderId,
          carrier: shippingForm.carrier,
          trackingNumber: shippingForm.trackingNumber.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '처리 중 오류가 발생했습니다.')
        return
      }
      setShippingModal(null)
      await fetchOrders()
      alert('송장 등록 완료')
    } catch (error) {
      console.error('송장 등록 실패:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setShippingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">주문 조회</h1>
        <button
          onClick={handleConfirmPayment}
          className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50"
          disabled={selectedIds.length === 0}
        >
          선택 입금확인 ({selectedIds.length})
        </button>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          주문 내역이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left w-12">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(selectableIds)
                      } else {
                        setSelectedIds([])
                      }
                    }}
                    checked={selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))}
                    disabled={selectableIds.length === 0}
                  />
                </th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">주문일</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">주문자</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">상품</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">금액</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">상태</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">송장 / 액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const tracking = order.items[0]?.trackingNumber
                const carrier = order.items[0]?.carrier
                const trackingUrl = carrier && tracking ? getTrackingUrl(carrier, tracking) : ''

                return (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        disabled={order.status !== 'DEPOSIT_REQUESTED'}
                      />
                    </td>
                    <td className="p-4 text-sm">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="p-4 text-sm">
                      {order.user?.name || order.user?.email || '-'}
                    </td>
                    <td className="p-4 text-sm">
                      {order.items.map((item) => (
                        <div key={item.id}>{item.product.name} × {item.quantity}</div>
                      ))}
                    </td>
                    <td className="p-4 text-sm font-semibold">
                      {order.totalAmount.toLocaleString()}원
                    </td>
                    <td className="p-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="p-4 text-sm">
                      {order.status === 'PAYMENT_CONFIRMED' && (
                        <button
                          onClick={() => openShippingModal(order.id)}
                          className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600"
                        >
                          송장등록
                        </button>
                      )}
                      {(order.status === 'SHIPPING' || order.status === 'DELIVERED') && carrier && tracking && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">{carrier}</p>
                          <p className="text-xs font-mono font-semibold">{tracking}</p>
                          <div className="flex gap-1">
                            {trackingUrl && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200"
                              >
                                배송추적
                              </a>
                            )}
                            {order.status === 'SHIPPING' && (
                              <button
                                onClick={() => handleCompleteDelivery(order.id)}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200"
                              >
                                배송완료
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 송장 등록 모달 */}
      {shippingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-4">송장 등록</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  택배사
                </label>
                <select
                  value={shippingForm.carrier}
                  onChange={(e) => setShippingForm((f) => ({ ...f, carrier: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  송장번호
                </label>
                <input
                  type="text"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => setShippingForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                  placeholder="송장번호를 입력하세요"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRegisterShipping() }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShippingModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                disabled={shippingLoading}
              >
                취소
              </button>
              <button
                onClick={handleRegisterShipping}
                className="flex-1 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50"
                disabled={shippingLoading}
              >
                {shippingLoading ? '처리 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
