'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'

export default function WithdrawPage() {
  const { status } = useSession()
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const withdraw = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/profile/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || '탈퇴 처리에 실패했습니다.')
        return
      }
      await signOut({ callbackUrl: '/' })
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-enter">
      <PageHeader title="회원 탈퇴" />
      <div className="px-4 py-6 space-y-4">
        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-3 text-sm text-gray-700 leading-relaxed">
          <h2 className="font-bold text-gray-900">탈퇴하면 이렇게 처리됩니다</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>이름·이메일·전화번호·주소 등 회원 정보와 저장한 배송지, 장바구니를 바로 삭제합니다.</li>
            <li>소셜 로그인 연결을 끊습니다. 같은 계정으로 다시 로그인하면 새 회원으로 가입됩니다.</li>
            <li>주문·입금·배송 기록은 전자상거래법에 따라 정해진 기간(최대 5년) 동안 보관한 뒤 파기합니다.</li>
          </ul>
          <p className="text-gray-500">
            진행 중인 주문이나 환불이 끝나지 않은 주문이 있으면 탈퇴할 수 없습니다. 입금 전 주문은{' '}
            <Link href="/orders" className="underline">주문 내역</Link>에서 취소할 수 있습니다.
          </p>
          <p className="text-gray-500">
            소셜 서비스(구글·네이버·카카오)의 연결된 앱 목록에서도 오늘의귤을 직접 해제할 수 있습니다.
          </p>
        </section>

        <label className="flex items-start gap-2 text-sm font-medium text-gray-800 px-1">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
          위 내용을 확인했으며 탈퇴합니다.
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={withdraw}
          disabled={!confirmed || busy || status !== 'authenticated'}
          className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50"
        >
          {busy ? '처리 중...' : '회원 탈퇴'}
        </button>
        <Link href="/profile" className="block text-center text-sm text-gray-500 underline">
          돌아가기
        </Link>
      </div>
    </div>
  )
}
