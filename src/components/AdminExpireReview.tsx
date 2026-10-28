'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CandidateOrder {
  id: string
  status: 'DRAFT' | 'DEPOSIT_REQUESTED'
  totalAmount: number
  depositorName: string | null
  createdAt: string
  requestedDepositAt: string | null
  user: { name: string | null; email: string | null }
}

interface Candidates {
  timeoutHours: number
  cutoff: string
  drafts: CandidateOrder[]
  requested: CandidateOrder[]
}

interface CancelResult {
  canceled: string[]
  skipped: { id: string; reason: string }[]
  restoredStock: number
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function OrderLine({ order, time }: { order: CandidateOrder; time: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-900 truncate">
        <Link href={`/admin/orders?q=${encodeURIComponent(order.id)}`} className="font-mono text-xs text-orange-600 hover:underline">
          {order.id.slice(-8)}
        </Link>{' '}
        {order.user.name ?? order.user.email ?? '-'} · 입금자 {order.depositorName ?? '-'}
      </p>
      <p className="text-xs text-gray-500">
        {order.totalAmount.toLocaleString()}원 · {time}
      </p>
    </div>
  )
}

// 입금기한 경과 주문 검토 — 관리자가 계좌 입금내역을 직접 대조한 뒤 선택한 입금 대기 주문만 취소
export function AdminExpireReview() {
  const [data, setData] = useState<Candidates | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checkedBank, setCheckedBank] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CancelResult | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/orders/expire', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setSelected(new Set())
      setCheckedBank(false)
    } catch (e) {
      alert(e instanceof Error && e.message ? e.message : '조회에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const cancelSelected = async () => {
    if (!checkedBank || selected.size === 0) return
    if (!confirm(`선택한 ${selected.size}건을 취소하고 재고를 복구합니다. 계좌에 입금이 없음을 확인했습니까?`)) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/orders/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [...selected], confirmedNoDeposit: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
      await load()
    } catch (e) {
      alert(e instanceof Error && e.message ? e.message : '처리에 실패했습니다.')
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-8 p-4 bg-white rounded-xl shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-gray-900">입금기한 경과 주문 검토</p>
          <p className="text-xs text-gray-500 mt-0.5">
            시간이 지났다고 자동 취소하지 않습니다. 계좌 입금내역과 대조한 뒤 입금이 없는 주문만 선택해 취소하세요.
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '불러오는 중...' : data ? '새로고침' : '검토 목록 불러오기'}
        </button>
      </div>

      {result && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 space-y-1">
          <p>
            취소 <strong>{result.canceled.length}</strong>건 · 재고복구 <strong>{result.restoredStock}</strong>개
          </p>
          {result.skipped.map((s) => (
            <p key={s.id} className="text-red-500">
              {s.id.slice(-8)}: {s.reason}
            </p>
          ))}
        </div>
      )}

      {data && (
        <div className="mt-4 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-gray-800">
              입금 대기 {data.timeoutHours}시간 경과 ({data.drafts.length}건)
            </h3>
            {data.drafts.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">해당 주문이 없습니다.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {data.drafts.map((o) => (
                  <li key={o.id}>
                    <label className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-red-500"
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                      />
                      <OrderLine order={o} time={`주문 ${fmt(o.createdAt)}`} />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {data.drafts.length > 0 && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-start gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4"
                    checked={checkedBank}
                    onChange={(e) => setCheckedBank(e.target.checked)}
                  />
                  선택한 주문의 금액·입금자명으로 계좌 입금내역을 확인했고 입금이 없습니다.
                </label>
                <button
                  onClick={cancelSelected}
                  disabled={isLoading || !checkedBank || selected.size === 0}
                  className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  선택 {selected.size}건 취소
                </button>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800">
              입금확인 요청 후 {data.timeoutHours}시간 경과 ({data.requested.length}건)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              고객이 입금했다고 요청한 주문이라 여기서 취소할 수 없습니다. 계좌를 확인해 입금완료 처리하거나 고객에게 연락하세요.
            </p>
            {data.requested.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-100 border border-yellow-100 bg-yellow-50/40 rounded-lg">
                {data.requested.map((o) => (
                  <li key={o.id} className="px-3 py-2">
                    <OrderLine order={o} time={`요청 ${o.requestedDepositAt ? fmt(o.requestedDepositAt) : '-'}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
