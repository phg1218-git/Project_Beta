'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminOrderMemo({ orderId, initialMemo }: { orderId: string; initialMemo: string | null }) {
  const router = useRouter()
  const [memo, setMemo] = useState(initialMemo || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const changed = memo.trim() !== (initialMemo || '')
  return <div className="mt-2 min-w-44 max-w-xs">
    <label className="block text-xs font-semibold text-gray-600 mb-1">관리자 메모</label>
    <textarea value={memo} maxLength={1000} onChange={e => setMemo(e.target.value)} rows={2}
      className="w-full rounded-lg border border-gray-200 p-2 text-xs" placeholder="배송 시 참고할 메모" />
    <button type="button" disabled={!changed || busy} onClick={async () => {
      setBusy(true); setMessage('')
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/memo`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memo }),
        })
        if (!res.ok) { setMessage('저장에 실패했습니다.'); return }
        setMessage('저장되었습니다.'); router.refresh()
      } catch { setMessage('저장에 실패했습니다.') } finally { setBusy(false) }
    }} className="rounded bg-orange-500 px-2 py-1 text-xs text-white disabled:opacity-40">메모 저장</button>
    {message && <span className="ml-2 text-xs" role="status">{message}</span>}
  </div>
}
