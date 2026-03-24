'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
  productName: string
  maxStock: number
  isSoldOut: boolean
}

type ToastState = { type: 'idle' } | { type: 'success'; message: string } | { type: 'error'; message: string }

export function AddToCartButton({ productId, productName, maxStock, isSoldOut }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [toast, setToast] = useState<ToastState>({ type: 'idle' })

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast({ type: 'idle' }), 3500)
  }

  const handleAddToCart = async () => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    if (isSoldOut || quantity < 1) return

    setIsAdding(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      if (res.ok) {
        showToast('success', `${productName}이(가) 장바구니에 담겼습니다.`)
        setQuantity(1)
      } else {
        const data = await res.json()
        showToast('error', data.error || '장바구니 추가에 실패했습니다.')
      }
    } catch {
      showToast('error', '네트워크 오류가 발생했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  if (isSoldOut) {
    return (
      <button
        onClick={() => router.push('/products')}
        className="w-full py-3 bg-gray-400 text-white font-bold rounded-lg cursor-default"
      >
        다른 상품 보기
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* 토스트 */}
      {toast.type !== 'idle' && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.message}
          {toast.type === 'success' && (
            <button
              onClick={() => router.push('/cart')}
              className="ml-2 underline font-semibold"
            >
              장바구니 보기
            </button>
          )}
        </div>
      )}

      {/* 수량 선택 */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">수량</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
            aria-label="수량 감소"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={maxStock}
            value={quantity}
            onChange={(e) => {
              const val = Math.max(1, Math.min(maxStock, parseInt(e.target.value) || 1))
              setQuantity(val)
            }}
            className="w-16 text-center border border-gray-300 rounded-lg py-2 text-sm font-semibold"
            aria-label="수량"
          />
          <button
            onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
            className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
            aria-label="수량 증가"
          >
            +
          </button>
        </div>
      </div>

      {/* 장바구니 추가 버튼 */}
      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
        aria-label="장바구니에 추가"
      >
        {isAdding ? '추가 중...' : '장바구니에 추가'}
      </button>
    </div>
  )
}
