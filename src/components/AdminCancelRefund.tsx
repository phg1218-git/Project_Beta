'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface Props {
  order: {
    id: string
    status: string
    totalAmount: number
    paidAt?: Date | string | null
    refunded?: boolean
  }
}

const UNPAID = ['DRAFT', 'DEPOSIT_REQUESTED']
const SHIPPED = ['SHIPPING', 'DELIVERED']

// 관리자 개별 취소와 환불 기록. 환불 송금은 관리자가 계좌에서 직접 한다.
export function AdminCancelRefund({ order }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'cancel' | 'refund' | null>(null)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [restock, setRestock] = useState(false)
  const [amount, setAmount] = useState(order.totalAmount)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const unpaid = UNPAID.includes(order.status)
  const shipped = SHIPPED.includes(order.status)
  const canCancel = order.status !== 'CANCELED'
  const needsRefund = order.status === 'CANCELED' && !!order.paidAt && !order.refunded

  if (!canCancel && !needsRefund) return null

  const open = (next: 'cancel' | 'refund') => {
    setMode(next); setReason(''); setConfirmed(false); setRestock(false)
    setAmount(order.totalAmount); setNote(''); setError('')
  }

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const res = mode === 'cancel'
        ? await fetch(`/api/admin/orders/${order.id}/cancel`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expectedStatus: order.status, reason, restock, confirmedNoDeposit: unpaid && confirmed }),
          })
        : await fetch(`/api/admin/orders/${order.id}/refund`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, note, confirmedTransfer: confirmed }),
          })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || '처리에 실패했습니다.'); return }
      setMode(null)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally { setBusy(false) }
  }

  const confirmLabel = mode === 'refund'
    ? `고객 계좌로 ${formatPrice(amount || 0)}을 실제로 송금했습니다.`
    : unpaid
      ? '계좌 입금 내역을 확인했고, 이 주문의 입금이 없습니다.'
      : `입금된 ${formatPrice(order.totalAmount)}의 환불이 필요한 취소임을 확인했습니다.`
  const ready = confirmed && !busy && (mode === 'refund'
    ? Number.isInteger(amount) && amount >= 1 && amount <= order.totalAmount
    : reason.trim().length > 0)

  return (
    <>
      <button
        onClick={() => open(canCancel ? 'cancel' : 'refund')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${canCancel ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-white bg-red-500 border-red-500 hover:bg-red-600'}`}
      >
        {canCancel ? '주문 취소' : '환불 완료 기록'}
      </button>

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setMode(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby={`cr-${order.id}`} className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto space-y-4">
            <h3 id={`cr-${order.id}`} className="text-lg font-bold">
              {mode === 'cancel' ? '주문 취소' : '환불 완료 기록'} · {order.id.slice(-8).toUpperCase()}
            </h3>

            {mode === 'cancel' ? (
              <>
                <p className="text-sm text-gray-600">
                  {unpaid
                    ? '미입금 주문을 취소하고 재고를 되돌립니다. 입금이 있었다면 먼저 입금완료 처리한 뒤 취소해주세요.'
                    : shipped
                      ? '발송된 주문을 취소합니다. 환불이 필요한 주문으로 표시되며, 회수한 상품을 다시 팔 수 있을 때만 재고를 되돌리세요.'
                      : '입금된 주문을 취소하고 재고를 되돌립니다. 환불이 필요한 주문으로 표시됩니다.'}
                </p>
                <div>
                  <label htmlFor={`reason-${order.id}`} className="block text-sm font-medium mb-1">취소 사유 (고객에게 표시)</label>
                  <input id={`reason-${order.id}`} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)}
                    placeholder="예: 고객 요청, 재고 부족, 미입금"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
                {shipped && (
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="mt-1" />
                    상품을 회수해 다시 판매할 수 있어 재고를 되돌립니다.
                  </label>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">사이트는 송금을 하지 않습니다. 계좌에서 직접 송금한 뒤 금액을 기록해주세요. 기록은 한 번만 남길 수 있습니다.</p>
                <div>
                  <label htmlFor={`amount-${order.id}`} className="block text-sm font-medium mb-1">환불 금액 (최대 {formatPrice(order.totalAmount)})</label>
                  <input id={`amount-${order.id}`} type="number" min={1} max={order.totalAmount} step={1} value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label htmlFor={`note-${order.id}`} className="block text-sm font-medium mb-1">메모 (선택, 고객에게 표시되지 않음)</label>
                  <input id={`note-${order.id}`} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)}
                    placeholder="예: 10/28 국민은행으로 송금"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              </>
            )}

            <label className="flex items-start gap-2 text-sm font-medium">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
              {confirmLabel}
            </label>

            {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setMode(null)} disabled={busy} className="flex-1 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                닫기
              </button>
              <button onClick={submit} disabled={!ready} className="flex-1 py-2 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">
                {busy ? '처리 중...' : mode === 'cancel' ? '취소 처리' : '환불 기록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
