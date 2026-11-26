'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Landmark } from 'lucide-react'
import { bankAccountNumber } from '@/lib/bank-account'

type CopyState = 'idle' | 'copied' | 'error'

export function BankAccountInfo({ account }: { account: string }) {
  const [state, setState] = useState<CopyState>('idle')
  const number = bankAccountNumber(account)

  useEffect(() => {
    if (state !== 'copied') return
    const timer = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [state])

  if (!account.trim()) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number || account)
      setState('copied')
    } catch {
      setState('error')
    }
  }

  const copied = state === 'copied'
  const label = number ? '계좌번호 복사' : '계좌 정보 복사'

  return (
    <div className="rounded-2xl bg-white border border-orange-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500">
          <Landmark className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-orange-600">입금 계좌</p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900 whitespace-pre-wrap break-words select-all tabular-nums">
            {account}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors active:scale-[0.99] ${
          copied
            ? 'bg-emerald-500 text-white'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        }`}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? '복사되었습니다' : label}
      </button>

      <p role="status" aria-live="polite" className={state === 'error' ? 'mt-2 text-xs text-red-500' : 'sr-only'}>
        {state === 'error'
          ? '복사하지 못했습니다. 계좌 정보를 길게 누르거나 선택해서 복사해주세요.'
          : copied ? (number ? '계좌번호를 복사했습니다.' : '계좌 정보를 복사했습니다.') : ''}
      </p>
    </div>
  )
}
