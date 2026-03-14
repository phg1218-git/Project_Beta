'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  carrier: string | null
  trackingNumber: string | null
  shippedAt: Date | string | null
  product: { name: string }
}

interface Order {
  id: string
  status: string
  items?: OrderItem[]
}

interface ItemShipState {
  carrier: string
  trackingNumber: string
}

export function AdminOrderActions({ order }: { order: Order }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [shipMode, setShipMode] = useState<'single' | 'partial'>('single')

  // 단건 배송 상태
  const [carrier, setCarrier] = useState('CJ대한통운')
  const [trackingNumber, setTrackingNumber] = useState('')

  // 아이템별 배송 상태
  const [itemStates, setItemStates] = useState<Record<string, ItemShipState>>({})

  const updateItemState = (itemId: string, field: keyof ItemShipState, value: string) => {
    setItemStates((prev) => {
      const existing = prev[itemId] ?? { carrier: 'CJ대한통운', trackingNumber: '' }
      return { ...prev, [itemId]: { ...existing, [field]: value } }
    })
  }

  const handleConfirmPayment = async () => {
    if (!confirm('입금을 확인하시겠습니까?')) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/confirm-payment`, { method: 'POST' })
      if (res.ok) {
        alert('입금이 확인되었습니다.')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || '처리에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShip = async () => {
    setIsLoading(true)
    try {
      let body: unknown

      if (shipMode === 'partial' && order.items && order.items.length > 0) {
        const items = order.items
          .filter((item) => itemStates[item.id]?.trackingNumber?.trim())
          .map((item) => ({
            orderItemId: item.id,
            carrier: itemStates[item.id]?.carrier || 'CJ대한통운',
            trackingNumber: itemStates[item.id].trackingNumber.trim(),
          }))

        if (items.length === 0) {
          alert('송장번호를 하나 이상 입력해주세요.')
          setIsLoading(false)
          return
        }
        body = { items }
      } else {
        if (!trackingNumber.trim()) {
          alert('송장번호를 입력해주세요.')
          setIsLoading(false)
          return
        }
        body = { carrier, trackingNumber }
      }

      const res = await fetch(`/api/admin/orders/${order.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        alert('배송 처리가 완료되었습니다.')
        setShowShippingModal(false)
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || '처리에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelivered = async () => {
    if (!confirm('배송 완료 처리하시겠습니까?')) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/delivered`, { method: 'POST' })
      if (res.ok) {
        alert('배송 완료 처리되었습니다.')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || '처리에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const hasMultipleItems = (order.items?.length ?? 0) > 1

  return (
    <div className="flex items-center gap-2">
      {order.status === 'DEPOSIT_REQUESTED' && (
        <button
          onClick={handleConfirmPayment}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          입금확인
        </button>
      )}

      {(order.status === 'PAYMENT_CONFIRMED' || order.status === 'SHIPPING') && (
        <button
          onClick={() => setShowShippingModal(true)}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          배송처리
        </button>
      )}

      {order.status === 'SHIPPING' && (
        <button
          onClick={handleDelivered}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          배송완료
        </button>
      )}

      {/* 배송 모달 */}
      {showShippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShippingModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">배송 정보 입력</h3>

            {/* 배송 모드 선택 (다중 아이템일 때만) */}
            {hasMultipleItems && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setShipMode('single')}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    shipMode === 'single'
                      ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  전체 일괄
                </button>
                <button
                  onClick={() => setShipMode('partial')}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    shipMode === 'partial'
                      ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  아이템별 부분배송
                </button>
              </div>
            )}

            {shipMode === 'single' || !hasMultipleItems ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">택배사</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="CJ대한통운">CJ대한통운</option>
                    <option value="한진택배">한진택배</option>
                    <option value="롯데택배">롯데택배</option>
                    <option value="우체국택배">우체국택배</option>
                    <option value="로젠택배">로젠택배</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">송장번호</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="송장번호 입력"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {item.product.name} × {item.quantity}
                      {item.shippedAt && (
                        <span className="ml-2 text-xs text-green-600 font-normal">발송완료</span>
                      )}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={itemStates[item.id]?.carrier ?? 'CJ대한통운'}
                        onChange={(e) => updateItemState(item.id, 'carrier', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                      >
                        <option value="CJ대한통운">CJ대한통운</option>
                        <option value="한진택배">한진택배</option>
                        <option value="롯데택배">롯데택배</option>
                        <option value="우체국택배">우체국택배</option>
                        <option value="로젠택배">로젠택배</option>
                      </select>
                      <input
                        type="text"
                        value={itemStates[item.id]?.trackingNumber ?? ''}
                        onChange={(e) => updateItemState(item.id, 'trackingNumber', e.target.value)}
                        placeholder="송장번호 (선택)"
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400">송장번호를 입력한 아이템만 배송처리됩니다.</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowShippingModal(false)}
                className="flex-1 py-2 rounded-lg font-medium text-gray-600 bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleShip}
                disabled={isLoading}
                className="flex-1 py-2 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '배송 시작'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
