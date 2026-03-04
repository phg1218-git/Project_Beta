'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  imageUrl?: string | null
}

interface ShippingAddress {
  id: string
  name: string
  phone: string
  addressBase: string
  addressDetail: string
  label: string | null
  isDefault: boolean
  isFromProfile?: boolean
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isGift, setIsGift] = useState(false)
  const [recipient, setRecipient] = useState({
    name: '',
    phone: '',
    addressBase: '',
    addressDetail: '',
  })
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([])
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 상품 정보 로드
  useEffect(() => {
    fetchProduct()
  }, [productId])

  // 기본 배송지 자동 완성
  useEffect(() => {
    if (session?.user && !isGift) {
      fetchDefaultAddress()
    }
  }, [session, isGift])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) {
        const data = await res.json()
        setProduct(data)
      } else {
        router.push('/products')
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
      router.push('/products')
    } finally {
      setLoading(false)
    }
  }

  const fetchDefaultAddress = async () => {
    try {
      const res = await fetch('/api/shipping/default')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setRecipient({
            name: data.name || '',
            phone: data.phone || '',
            addressBase: data.addressBase || '',
            addressDetail: data.addressDetail || '',
          })
        }
      }
    } catch (error) {
      console.error('기본 배송지 조회 실패:', error)
    }
  }

  const fetchSavedAddresses = async () => {
    try {
      const res = await fetch('/api/shipping')
      if (res.ok) {
        const data = await res.json()
        setSavedAddresses(data)
      }
    } catch (error) {
      console.error('배송지 목록 조회 실패:', error)
    }
  }

  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '').slice(0, 11)
    let formatted = numbers
    if (numbers.length > 3 && numbers.length <= 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length > 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    setRecipient({ ...recipient, phone: formatted })
  }

  const handleGiftToggle = () => {
    if (!isGift) {
      setRecipient({ name: '', phone: '', addressBase: '', addressDetail: '' })
    } else {
      fetchDefaultAddress()
    }
    setIsGift(!isGift)
  }

  const openAddressModal = async () => {
    await fetchSavedAddresses()
    setShowAddressModal(true)
  }

  const selectAddress = (addr: ShippingAddress) => {
    setRecipient({
      name: addr.name,
      phone: addr.phone,
      addressBase: addr.addressBase,
      addressDetail: addr.addressDetail || '',
    })
    setShowAddressModal(false)
  }

  const handleAddToCart = async () => {
    if (status !== 'authenticated') {
      router.push('/login')
      return
    }

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      if (res.ok) {
        alert('장바구니에 담았어요! 🛒')
      } else {
        alert('장바구니 추가에 실패했어요.')
      }
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
    }
  }

  const handleOrder = async () => {
    if (status !== 'authenticated') {
      router.push('/login')
      return
    }

    if (!recipient.name || !recipient.phone || !recipient.addressBase) {
      alert('수령인 정보를 모두 입력해주세요.')
      return
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/
    if (!phoneRegex.test(recipient.phone)) {
      alert('올바른 휴대폰 번호 형식이 아닙니다. (010-0000-0000)')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              productId,
              quantity,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              recipientAddressBase: recipient.addressBase,
              recipientAddressDetail: recipient.addressDetail,
            },
          ],
        }),
      })

      if (res.ok) {
        alert('주문이 완료됐어요! 입금 후 배송이 시작됩니다. 🍊')
        router.push('/orders')
      } else {
        const error = await res.json()
        alert(error.error || '주문에 실패했어요.')
      }
    } catch (error) {
      console.error('주문 실패:', error)
      alert('주문 중 오류가 발생했어요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🍊</div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">😢</div>
          <p className="text-gray-500">상품을 찾을 수 없어요.</p>
        </div>
      </div>
    )
  }

  const totalPrice = product.price * quantity
  const isSoldOut = product.stock === 0

  return (
    <div className="max-w-2xl mx-auto pb-36">

      {/* 상품 이미지 — 고정 높이로 제한 */}
      <div className="w-full h-52 sm:h-64 bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl">🍊</span>
        )}
      </div>

      {/* 상품 정보 */}
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-extrabold text-orange-500">{formatPrice(product.price)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">택배비 포함</p>
          {isSoldOut ? (
            <p className="text-xs text-red-500 font-semibold mt-0.5">품절</p>
          ) : product.stock <= 5 ? (
            <p className="text-xs text-red-500 font-semibold mt-0.5">⚡ 잔여 {product.stock}개</p>
          ) : (
            <p className="text-xs text-green-600 font-semibold mt-0.5">✔ 재고 있음</p>
          )}
        </div>
      </div>

      {!isSoldOut && (
        <>
          {/* 수량 + 수령인 헤더 한 줄 */}
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">수량</span>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold text-lg"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openAddressModal}
                className="text-sm text-orange-500 font-medium"
              >
                배송지 변경
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={handleGiftToggle}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">🎁 선물</span>
              </label>
            </div>
          </div>

          {/* 수령인 정보 */}
          <div className="px-4 pb-3 border-t border-gray-100 pt-3">
            <h2 className="text-sm font-bold text-gray-700 mb-2">
              {isGift ? '🎁 선물 받을 분 정보' : '수령인 정보'}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={recipient.name}
                onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                placeholder="수령인 이름"
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <input
                type="tel"
                value={recipient.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-0000-0000"
                maxLength={13}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <input
                type="text"
                value={recipient.addressBase}
                onChange={(e) => setRecipient({ ...recipient, addressBase: e.target.value })}
                placeholder="주소"
                className="col-span-2 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <input
                type="text"
                value={recipient.addressDetail}
                onChange={(e) => setRecipient({ ...recipient, addressDetail: e.target.value })}
                placeholder="상세주소 (선택)"
                className="col-span-2 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>
        </>
      )}

      {/* 하단 고정 바 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 z-[150] shadow-lg">
        {isSoldOut ? (
          <button
            disabled
            className="flex-1 py-3 bg-gray-300 text-gray-500 font-bold rounded-xl cursor-not-allowed"
          >
            품절
          </button>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">총 결제금액</p>
              <p className="text-lg font-bold text-orange-500">{formatPrice(totalPrice)}</p>
            </div>
            <button
              onClick={handleAddToCart}
              className="px-4 py-3 border-2 border-orange-500 text-orange-500 font-bold rounded-xl hover:bg-orange-50 shrink-0"
            >
              🛒
            </button>
            <button
              onClick={handleOrder}
              disabled={isSubmitting}
              className="px-5 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? '주문 중...' : '바로 주문'}
            </button>
          </>
        )}
      </div>

      {/* 배송지 선택 모달 */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200]">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold">배송지 선택</h2>
              <button onClick={() => setShowAddressModal(false)} className="text-2xl text-gray-400">×</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {savedAddresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>저장된 배송지가 없어요.</p>
                  <button
                    onClick={() => {
                      setShowAddressModal(false)
                      router.push('/profile/shipping')
                    }}
                    className="mt-3 text-orange-500 font-medium"
                  >
                    배송지 추가하기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => selectAddress(addr)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                        addr.isDefault ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded">
                            기본
                          </span>
                        )}
                        {addr.label && (
                          <span className="text-sm text-gray-500">{addr.label}</span>
                        )}
                      </div>
                      <p className="font-semibold">{addr.name}</p>
                      <p className="text-sm text-gray-600">{addr.phone}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {addr.addressBase} {addr.addressDetail}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
