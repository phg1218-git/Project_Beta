'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 전화·이메일로 접수한 탈퇴 요청 처리
export function AdminWithdrawButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/members/${userId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedRequest: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || '처리에 실패했습니다.'); return }
      setOpen(false)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setConfirmed(false); setError('') }}
        className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
        탈퇴 처리
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-bold">회원 탈퇴 처리 · {name}</h3>
            <p className="text-sm text-gray-600">
              회원 정보·배송지·장바구니·소셜 로그인 연결을 삭제합니다. 주문 기록은 법정 보존 기간 동안 남습니다.
              진행 중이거나 환불이 끝나지 않은 주문이 있으면 처리되지 않습니다. 되돌릴 수 없습니다.
            </p>
            <label className="flex items-start gap-2 text-sm font-medium">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
              회원 본인의 탈퇴 요청임을 확인했습니다.
            </label>
            {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 py-2 rounded-lg font-medium text-gray-600 bg-gray-100">닫기</button>
              <button onClick={submit} disabled={!confirmed || busy} className="flex-1 py-2 rounded-lg font-medium text-white bg-red-500 disabled:opacity-50">
                {busy ? '처리 중...' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
