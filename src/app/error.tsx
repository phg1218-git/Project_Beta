'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[RootError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        일시적인 서버 오류입니다. 잠시 후 다시 시도하거나, 문제가 지속되면 고객센터로 문의해주세요.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          홈으로
        </Link>
      </div>
      {error.digest && (
        <p className="mt-4 text-xs text-gray-300">오류 코드: {error.digest}</p>
      )}
    </div>
  )
}
