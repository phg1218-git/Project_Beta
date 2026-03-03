'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface CartItem {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  imageUrl?: string | null
}

export default function CartPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (error) {
      console.error('장바구니 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQty = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    const newQty = Math.max(1, Math.min(99, item.quantity + delta))
    
    try {
      await fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
      )
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
      await Promise.all(
        selectedIds.map((id) => fetch(`/api/cart/${id}`, { method: 'DELETE' }))
      )
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((i) => i.id))
    }
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
        <Link
          href="/products"
          className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-full"
        >
          상품 보러가기
        </Link>
      </div>
    )
  }

  return (
    <div className="page-enter pb-40">
      <div className="px-4 py-5 bg-white border-b border-gray-200">
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
            className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 mb-3"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              className="w-4 h-4 rounded mt-1"
            />
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
              🍊
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-gray-900">{item.productName}</p>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-400 hover:text-red-500 text-lg"
                >
                  ✕
                </button>
              </div>
              <p className="text-orange-500 font-bold mt-1">
                {formatPrice(item.price * item.quantity)}
              </p>
              <div className="flex items-center gap-2 mt-2 bg-gray-100 rounded-lg px-2 py-1 w-fit">
                <button
                  onClick={() => updateQty(item.id, -1)}
                  className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.id, 1)}
                  className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 결제바 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-[150] shadow-lg">
        <div>
          <p className="text-xs text-gray-500">총 결제금액</p>
          <p className="text-xl font-bold">{formatPrice(total)}</p>
        </div>
        <button className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl">
          주문하기
        </button>
      </div>
    </div>
  )
}
