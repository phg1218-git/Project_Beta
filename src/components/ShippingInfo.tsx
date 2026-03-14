'use client'

import { useState, useEffect } from 'react'
import { formatPhoneNumber } from '@/lib/utils'

interface OrderItem {
  id: string
  recipientName: string
  recipientPhone: string
  recipientAddressBase: string
  recipientAddressDetail: string | null
  trackingNumber: string | null
  carrier: string | null
  shippedAt: Date | string | null
  deliveredAt: Date | string | null
  product?: { name: string }
  quantity?: number
}

interface ShippingInfoProps {
  orderId: string
  orderItems: OrderItem[]
}

function getTrackingUrl(carrier: string | null, trackingNumber: string | null): string {
  if (!carrier || !trackingNumber) return '#'
  const carrierUrls: Record<string, string> = {
    'CJ대한통운': `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${trackingNumber}`,
    '한진택배': `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=4&wblnum=${trackingNumber}`,
    '롯데택배': `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${trackingNumber}`,
    '우체국택배': `https://service.epost.go.kr/trace.RetrieveDomRi498TraceList.comm?sid1=${trackingNumber}`,
    '로젠택배': `https://www.ilogen.com/web/personal/trace/${trackingNumber}`,
  }
  return carrierUrls[carrier] || `https://search.naver.com/search.naver?query=${carrier}+${trackingNumber}`
}

export function ShippingInfo({ orderId, orderItems }: ShippingInfoProps) {
  const [shippingData, setShippingData] = useState<OrderItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchShippingInfo = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/shipping`)
        if (res.ok) {
          const data = await res.json()
          setShippingData(data.items)
        } else {
          setShippingData(orderItems)
        }
      } catch {
        setShippingData(orderItems)
      } finally {
        setIsLoading(false)
      }
    }
    fetchShippingInfo()
  }, [orderId, orderItems])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-center py-4">
          <span className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <span className="ml-2 text-gray-500">배송 정보 조회 중...</span>
        </div>
      </div>
    )
  }

  const items = shippingData || orderItems
  const firstItem = items[0]

  // 아이템별 송장이 다른지 확인 (부분배송 여부)
  const hasPartialShipping =
    items.length > 1 &&
    items.some((item) => item.trackingNumber !== items[0]?.trackingNumber)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {hasPartialShipping ? (
        // 아이템별 배송 정보 표시
        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => {
            const hasTracking = item.trackingNumber && item.carrier
            const trackingUrl = getTrackingUrl(item.carrier, item.trackingNumber)
            return (
              <div key={item.id ?? idx} className="p-4">
                {item.product && (
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    {item.product.name}
                    {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
                  </p>
                )}
                {hasTracking ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">택배사</span>
                      <span className="font-semibold text-gray-900">{item.carrier}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">송장번호</span>
                      <span className="font-semibold text-gray-900 font-mono">{item.trackingNumber}</span>
                    </div>
                    {item.shippedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">발송일</span>
                        <span className="text-sm text-gray-900">
                          {new Date(item.shippedAt).toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {item.deliveredAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">배송완료</span>
                        <span className="text-sm text-green-600 font-semibold">
                          {new Date(item.deliveredAt).toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 mt-1 text-center text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      배송 조회
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">배송 준비 중</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // 단건 배송 정보 표시 (기존 UI 유지)
        <div className="p-4 border-b border-gray-100">
          {firstItem?.trackingNumber && firstItem?.carrier ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">택배사</span>
                <span className="font-semibold text-gray-900">{firstItem.carrier}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">송장번호</span>
                <span className="font-semibold text-gray-900 font-mono">{firstItem.trackingNumber}</span>
              </div>
              {firstItem.shippedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">발송일</span>
                  <span className="text-sm text-gray-900">
                    {new Date(firstItem.shippedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {firstItem.deliveredAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">배송완료</span>
                  <span className="text-sm text-green-600 font-semibold">
                    {new Date(firstItem.deliveredAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              <a
                href={getTrackingUrl(firstItem.carrier, firstItem.trackingNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 mt-2 text-center text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
              >
                배송 조회하기
              </a>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-gray-500 text-sm">배송 준비 중입니다.</p>
              <p className="text-gray-500 text-sm">송장번호가 등록되면 배송 조회가 가능합니다.</p>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-gray-50">
        <p className="text-xs text-gray-500 mb-2">배송지</p>
        <p className="font-semibold text-gray-900">{firstItem?.recipientName}</p>
        <p className="text-sm text-gray-600 mt-1">{formatPhoneNumber(firstItem?.recipientPhone || '')}</p>
        <p className="text-sm text-gray-600 mt-1">
          {firstItem?.recipientAddressBase}
          {firstItem?.recipientAddressDetail && `, ${firstItem.recipientAddressDetail}`}
        </p>
      </div>
    </div>
  )
}
