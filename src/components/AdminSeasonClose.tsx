'use client'

import { useEffect, useState } from 'react'

interface SeasonInfo { season: number; orderCount: number }

export function AdminSeasonClose() {
  const [info, setInfo] = useState<SeasonInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/season', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then(setInfo)
      .catch(() => setError('시즌 정보를 불러오지 못했습니다.'))
  }, [])

  async function close() {
    if (!info || busy) return
    if (!window.confirm(`${info.season}시즌을 마감할까요?\n마감 후 새 주문은 ${info.season + 1}-1번부터 시작하며 되돌릴 수 없습니다.`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/admin/season', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season: info.season }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || '시즌을 마감하지 못했습니다.')
      setMessage(`${info.season}시즌을 마감했습니다.`)
      setInfo(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '네트워크 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold">주문 시즌</h2>
      <p className="mt-1 text-sm text-gray-600">
        주문번호는 시즌-순번(예: 2026-1)으로 매겨집니다. 시즌은 11월~다음해 2월이며, 마감하기 전까지는 3월 이후 주문도 같은 시즌 번호를 씁니다. 마감을 하지 않아도 11월이 되면 새 시즌으로 넘어갑니다.
      </p>
      {info && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-orange-800">현재 {info.season}시즌</p>
            <p className="text-xs text-gray-600">지금까지 {info.orderCount}건 · 다음 주문번호 {info.season}-{info.orderCount + 1}</p>
          </div>
          <button type="button" onClick={close} disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
            {busy ? '처리 중...' : `${info.season}시즌 마감`}
          </button>
        </div>
      )}
      {message && <p role="status" className="mt-2 text-sm text-emerald-600">{message}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}
