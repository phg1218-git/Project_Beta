'use client'

import { useState } from 'react'
import { bankAccountNumber } from '@/lib/bank-account'

export function BankAccountInfo({ account }: { account: string }) {
  const [message, setMessage] = useState('')
  const number = bankAccountNumber(account)
  if (!account.trim()) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number || account)
      setMessage(number ? '계좌번호를 복사했습니다.' : '계좌 정보를 복사했습니다.')
    } catch {
      setMessage('복사하지 못했습니다. 아래 계좌 정보를 길게 누르거나 선택해서 복사해주세요.')
    }
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <p className="text-sm font-semibold text-orange-800">입금 계좌 안내</p>
      <p className="mt-2 text-sm font-medium text-gray-900 whitespace-pre-wrap break-words select-all">{account}</p>
      <button type="button" onClick={copy}
        className="mt-3 px-4 py-2 rounded-lg bg-white border border-orange-300 text-sm font-semibold text-orange-800 hover:bg-orange-100">
        {number ? '계좌번호 복사' : '계좌 정보 복사'}
      </button>
      <p role="status" className="mt-2 text-xs text-gray-600">{message}</p>
    </div>
  )
}
