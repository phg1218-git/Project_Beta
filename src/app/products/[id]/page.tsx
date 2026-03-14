'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { formatPrice } from '@/lib/utils'

interface ProductDetail {
  id: string
  name: string
  description: string
  price: number
  stock: number
  isActive: boolean
  imageUrl?: string | null
  createdAt: string
}

const PRODUCT_EMOJIS = ['🍊', '🟠', '🍋', '🎁']

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const productId = params.id as string

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/products/${productId}`)
        
        if (!res.ok) {
          if (res.status === 404) {
            setError('상품을 찾을 수 없습니다.')
          } else {
            setError('상품 정보를 불러올 수 없습니다.')
          }
          return
        }

        const data: ProductDetail = await res.json()
        setProduct(data)
      } catch (err) {
        console.error('Failed to fetch product:', err)
        setError('상품 정보를 불러올 수 없습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleAddToCart = async () => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }

    if (!product || quantity < 1) return

    setIsAddingToCart(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
        }),
      })

      if (res.ok) {
        alert('장바구니에 추가되었습니다!')
        setQuantity(1)
        router.push('/cart')
      } else {
        alert('장바구니 추가에 실패했습니다.')
      }
    } catch (err) {
      console.error('Failed to add to cart:', err)
      alert('오류가 발생했습니다.')
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍊</div>
          <p className="text-gray-500">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😞</div>
          <p className="text-gray-900 font-bold text-lg mb-2">{error || '상품을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isSoldOut = product.stock === 0
  const emoji = PRODUCT_EMOJIS[Math.floor(Math.random() * PRODUCT_EMOJIS.length)]

  return (
    <div className="pb-24 bg-gray-50">
      <div className="bg-white md:max-w-5xl md:mx-auto md:shadow-sm">
        <div className="md:flex md:items-start">
          {/* 이미지: 모바일 h-72(288px), 데스크탑 h-[420px] 고정으로 과도한 세로 차지 방지 */}
          <div className="relative w-full h-72 md:w-1/2 md:h-[420px] bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center overflow-hidden shrink-0">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">{emoji}</span>
            )}

            {isSoldOut && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">품절</span>
              </div>
            )}
          </div>

          {/* 상품 정보: 데스크탑에서 우측 열 */}
          <div className="p-4 md:p-6 md:w-1/2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            <p className="text-sm text-gray-500 mb-4">
              {new Date(product.createdAt).toLocaleDateString('ko-KR')} 입고
            </p>

            {/* 가격 및 재고 */}
            <div className="mb-6">
              <p className={`text-3xl font-extrabold mb-2 ${
                isSoldOut ? 'text-gray-400' : 'text-orange-500'
              }`}>
                {isSoldOut ? '품절' : formatPrice(product.price)}
              </p>
              <p className={`text-sm font-semibold ${
                isSoldOut
                  ? 'text-gray-400'
                  : product.stock <= 5
                  ? 'text-red-500'
                  : 'text-green-600'
              }`}>
                {isSoldOut
                  ? '다음 수확을 기다려요 🍂'
                  : product.stock <= 5
                  ? `⚡ 재고 ${product.stock}개 남음`
                  : `✔ 재고 ${product.stock}개 충분함`}
              </p>
            </div>

            {/* 상품 설명 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-sm font-bold text-gray-900 mb-2">상품 설명</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* 수량 선택 */}
            {!isSoldOut && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  수량
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isSoldOut}
                    className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    aria-label="수량 감소"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1))
                      setQuantity(val)
                    }}
                    disabled={isSoldOut}
                    className="w-16 text-center border border-gray-300 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                    aria-label="수량"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={isSoldOut}
                    className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    aria-label="수량 증가"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* 장바구니 추가 버튼 */}
            {!isSoldOut && (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
                aria-label="장바구니에 추가"
              >
                {isAddingToCart ? '추가 중...' : '🛒 장바구니에 추가'}
              </button>
            )}

            {isSoldOut && (
              <button
                onClick={() => router.push('/products')}
                className="w-full py-3 bg-gray-400 text-white font-bold rounded-lg"
              >
                다른 상품 보기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
