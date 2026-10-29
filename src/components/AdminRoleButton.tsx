'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminRoleButton({ userId, name, isAdmin }: { userId: string; name: string; isAdmin: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nextRole = isAdmin ? 'USER' : 'ADMIN'
  const label = isAdmin ? '관리자 해제' : '관리자 지정'

  async function changeRole() {
    if (busy || !window.confirm(`${name}님을 ${isAdmin ? '일반회원으로 변경' : '관리자로 지정'}할까요?`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '권한을 변경하지 못했습니다.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '네트워크 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={changeRole} disabled={busy}
        className="text-xs text-orange-700 underline disabled:opacity-50">
        {busy ? '처리 중...' : label}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
