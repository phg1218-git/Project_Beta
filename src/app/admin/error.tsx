'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AdminError]', error)
  }, [error])

  return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-red-800 mb-2">데이터 조회 실패</h2>
        <p className="text-sm text-red-600 mb-1">
          DB 연결 오류 또는 서버 장애가 발생했습니다. 데이터를 가짜 값으로 대체하지 않습니다.
        </p>
        {error.message && (
          <p className="text-xs text-red-400 font-mono mt-2 bg-red-100 px-3 py-2 rounded">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="text-xs text-red-300 mt-1">digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
        >
          재시도
        </button>
      </div>
    </div>
  )
}
