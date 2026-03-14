'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface CartItem {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  stock: number
  imageUrl?: string | null
}

interface ShippingAddress {
  id: string
  name: string
  phone: string
  addressBase: string
  addressDetail: string | null
  label: string | null
  isDefault: boolean
}

export default function CartPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isOrdering, setIsOrdering] = useState(false)

  // 배송지 선택
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)

  useEffect(() => {
    fetchCart()
    fetchAddresses()
  }, [])

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
        setSelectedIds(data.map((item: CartItem) => item.id))
      }
    } catch (error) {
      console.error('장바구니 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/shipping-addresses')
      if (res.ok) {
        const data: ShippingAddress[] = await res.json()
        setAddresses(data)
        const def = data.find((a) => a.isDefault)
        setSelectedAddressId(def?.id ?? data[0]?.id ?? null)
      }
    } catch {
      // 무시 — 서버에서 fallback 처리
    }
  }

  const updateQty = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const newQty = Math.max(1, Math.min(item.stock, item.quantity + delta))
    try {
      await fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)))
    } catch (error) {
      console.error('수량 변경 실패:', error)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/cart/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((i) => i.id !== id))
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    } catch (error) {
      console.error('삭제 실패:', error)
    }
  }

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 상품을 선택해주세요.')
      return
    }
    if (!confirm(`${selectedIds.length}개 상품을 삭제할까요?`)) return
    try {
      await Promise.all(selectedIds.map((id) => fetch(`/api/cart/${id}`, { method: 'DELETE' })))
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)))
      setSelectedIds([])
    } catch (error) {
      console.error('일괄 삭제 실패:', error)
    }
  }

  const deleteAll = async () => {
    if (items.length === 0) return
    if (!confirm('장바구니를 비울까요?')) return
    try {
      await fetch('/api/cart', { method: 'DELETE' })
      setItems([])
      setSelectedIds([])
    } catch (error) {
      console.error('전체 삭제 실패:', error)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === items.length ? [] : items.map((i) => i.id))
  }

  const selectedItems = items.filter((item) => selectedIds.includes(item.id))
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  const handleOrder = async () => {
    if (selectedIds.length === 0) {
      alert('주문할 상품을 선택해주세요.')
      return
    }

    if (!session?.user?.profileComplete) {
      alert('배송 정보를 먼저 등록해주세요.')
      router.push('/profile/setup')
      return
    }

    setIsOrdering(true)
    try {
      const orderItems = selectedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))

      const body: Record<string, unknown> = {
        items: orderItems,
        fromCart: true,
        cartItemIds: selectedIds,
      }
      // 선택한 배송지가 있으면 전달
      if (selectedAddressId) {
        body.shippingAddressId = selectedAddressId
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '주문 생성에 실패했습니다.')
        return
      }

      alert('주문이 생성되었습니다! 입금 후 입금확인 요청을 해주세요.')
      router.push(`/orders/${data.id}`)
    } catch (error) {
      console.error('주문 생성 오류:', error)
      alert('주문 생성 중 오류가 발생했습니다.')
    } finally {
      setIsOrdering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🛒</div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-gray-500 text-center leading-relaxed mb-6">
          아직 담은 상품이 없어요.<br />달콤한 귤을 골라보세요 🍊
        </p>
        <Link href="/products" className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-full">
          상품 보러가기
        </Link>
      </div>
    )
  }

  return (
    <div className="page-enter pb-36">
      {/* 페이지 헤더 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">🛒 장바구니</h1>
        <p className="text-sm text-gray-500 mt-1">{items.length}개 상품</p>
      </div>

      {/* 선택/삭제 액션바 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.length === items.length && items.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-gray-600">전체선택</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={deleteSelected}
            className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
          >
            선택삭제
          </button>
          <button
            onClick={deleteAll}
            className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            전체삭제
          </button>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="px-4 py-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl shadow-sm p-4 flex gap-3 mb-3 border-2 transition-colors ${
              selectedIds.includes(item.id) ? 'border-orange-200' : 'border-transparent'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              className="w-4 h-4 rounded mt-1 accent-orange-500"
            />
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
              🍊
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-gray-900">{item.productName}</p>
                <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 text-lg">
                  ✕
                </button>
              </div>
              <p className="text-orange-500 font-bold mt-1">{formatPrice(item.price * item.quantity)}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold">−</button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold">+</button>
                </div>
                <span className="text-xs text-gray-400">재고 {item.stock}개</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 배송지 선택 섹션 */}
      {addresses.length > 0 && (
        <div className="px-4 mb-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">📦 배송지</p>
              <button
                onClick={() => setShowAddressModal(true)}
                className="text-xs text-orange-500 font-semibold hover:text-orange-600"
              >
                변경
              </button>
            </div>
            {selectedAddress ? (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedAddress.name}
                  {selectedAddress.label && (
                    <span className="ml-1 text-xs text-gray-400">[{selectedAddress.label}]</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedAddress.phone}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedAddress.addressBase}
                  {selectedAddress.addressDetail && `, ${selectedAddress.addressDetail}`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">기본 배송지로 주문됩니다.</p>
            )}
          </div>
        </div>
      )}

      {/* 하단 결제바 */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-[150] shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">선택 {selectedIds.length}개 상품</p>
            <p className="text-xl font-bold">{formatPrice(total)}</p>
          </div>
          <button
            onClick={handleOrder}
            disabled={isOrdering || selectedIds.length === 0}
            className={`px-6 py-3 font-bold rounded-xl transition-all ${
              isOrdering || selectedIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
            }`}
          >
            {isOrdering ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                처리 중...
              </span>
            ) : (
              '주문하기'
            )}
          </button>
        </div>
      </div>

      {/* 배송지 선택 모달 */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddressModal(false)} />
          <div className="relative bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">배송지 선택</h3>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id)
                    setShowAddressModal(false)
                  }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                    selectedAddressId === addr.id
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">{addr.name}</p>
                    {addr.label && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{addr.label}</span>}
                    {addr.isDefault && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">기본</span>}
                  </div>
                  <p className="text-xs text-gray-500">{addr.phone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {addr.addressBase}
                    {addr.addressDetail && `, ${addr.addressDetail}`}
                  </p>
                </button>
              ))}
            </div>
            <Link
              href="/profile/shipping"
              className="mt-4 block text-center text-sm text-orange-500 font-semibold hover:text-orange-600"
            >
              + 새 배송지 추가
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
