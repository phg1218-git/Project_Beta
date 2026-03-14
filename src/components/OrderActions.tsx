'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrderActionsProps {
  orderId: string
  status: string
  canRequestDeposit: boolean
  canCancel: boolean
}

export function OrderActions({ orderId, status: _status, canRequestDeposit, canCancel }: OrderActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleDepositRequest = async () => {
    if (!confirm('입금확인 요청 후에는 주문 수정/취소가 불가해요. 계속할까요?')) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/deposit-request`, {
        method: 'POST',
      })

      if (res.ok) {
        alert('입금확인 요청이 완료되었습니다. 관리자 확인 후 배송이 시작됩니다.')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || '요청에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('주문을 취소할까요? 취소 후에는 복구할 수 없습니다.')) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('주문이 취소되었습니다.')
        router.push('/orders')
      } else {
        const data = await res.json()
        alert(data.error || '취소에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // DRAFT 상태가 아니면 버튼 숨김
  if (!canRequestDeposit && !canCancel) {
    return null
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* 입금확인 요청 버튼 */}
      {canRequestDeposit && (
        <button
          onClick={handleDepositRequest}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              처리 중...
            </span>
          ) : (
            '입금확인 요청'
          )}
        </button>
      )}

      {/* 주문 취소 버튼 */}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="w-full py-3 rounded-xl font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          주문 취소
        </button>
      )}
    </div>
  )
}