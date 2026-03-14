'use client'

import { useState } from 'react'

interface ExpireResult {
  scanned: number
  expired: number
  canceled: number
  restoredStock: number
  skipped: number
  errors: string[]
}

export function AdminExpireButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ExpireResult | null>(null)

  const handleExpire = async () => {
    if (!confirm('만료된 입금 대기 주문을 자동취소하고 재고를 복구하시겠습니까?')) return

    setIsLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/orders/expire', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        alert(data.error || '처리에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="inline-block">
      <button
        onClick={handleExpire}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        {isLoading ? '처리 중...' : '⏰ 만료 주문 정리'}
      </button>

      {result && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 space-y-1">
          <p>검사: <strong>{result.scanned}</strong>건 | 만료: <strong>{result.expired}</strong>건 | 취소: <strong>{result.canceled}</strong>건</p>
          <p>재고복구: <strong>{result.restoredStock}</strong>개 | 건너뜀: <strong>{result.skipped}</strong>건</p>
          {result.errors.length > 0 && (
            <p className="text-red-500">오류 {result.errors.length}건</p>
          )}
        </div>
      )}
    </div>
  )
}
