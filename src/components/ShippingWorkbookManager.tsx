'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingOverlay } from '@/components/LoadingOverlay'

export function ShippingWorkbookManager({ pendingCount }: { pendingCount: number }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ ready: number; skipped: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  async function download() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/shipping-sheet', { cache: 'no-store' })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || '목록을 내려받지 못했습니다.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `배송목록-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '다운로드에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(apply: boolean) {
    if (!file || busy) return
    setBusy(true)
    setMessage('')
    setErrors([])
    const form = new FormData()
    form.set('file', file)
    try {
      const response = await fetch(`/api/admin/shipping-sheet${apply ? '' : '?preview=1'}`, {
        method: 'POST', body: form,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setErrors(Array.isArray(result.details) ? result.details : [])
        throw new Error(result.error || '파일을 처리하지 못했습니다.')
      }
      if (apply) {
        setMessage(`송장 ${result.updated}건을 등록했습니다. 이미 등록된 ${result.skipped}건은 건너뛰었습니다.`)
        setPreview(null)
        setFile(null)
        const input = document.getElementById('shipping-workbook-file') as HTMLInputElement | null
        if (input) input.value = ''
        router.refresh()
      } else {
        setPreview({ ready: result.ready, skipped: result.skipped })
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.')
      if (!apply) setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {busy && <LoadingOverlay message="배송 작업을 처리하는 중..." />}
      <section className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-lg">1. 배송할 상품 내려받기</h2>
        <p className="text-sm text-gray-600">현재 미발송 상품 {pendingCount.toLocaleString()}건. 입금완료 또는 부분배송 중인 주문의 미발송 상품만 포함합니다.</p>
        <button type="button" onClick={download} disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-orange-500 text-white font-semibold disabled:opacity-50">
          배송 목록 엑셀 다운로드
        </button>
      </section>
      <section className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-lg">2. CJ 운송장번호 입력</h2>
        <p className="text-sm text-gray-600">받은 파일의 <strong>송장입력</strong> 시트에서 운송장번호 열만 채워주세요. 택배사는 CJ대한통운으로 미리 입력돼 있습니다. 주문번호와 배송상품ID는 바꾸지 마세요.</p>
        <p className="text-sm text-gray-600">등록된 CJ 운송장번호는 고객 주문 상세의 배송 조회 버튼에서 CJ대한통운 공식 조회 화면으로 연결됩니다.</p>
        <p className="text-xs text-gray-500">한 번에 송장 200건까지 등록합니다. 번호를 비워 둔 행은 처리하지 않습니다. 엑셀에는 고객 연락처와 주소가 있으므로 업무 후 안전하게 보관하거나 삭제해주세요.</p>
        <input id="shipping-workbook-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); setMessage(''); setErrors([]) }}
          className="block w-full text-sm" />
        <button type="button" onClick={() => submit(false)} disabled={!file || busy}
          className="px-5 py-2.5 rounded-lg bg-gray-800 text-white font-semibold disabled:opacity-50">
          입력 내용 확인
        </button>
        {preview && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm space-y-2">
            <p>새 송장 <strong>{preview.ready}건</strong> · 이미 같은 번호로 등록된 송장 <strong>{preview.skipped}건</strong></p>
            <p className="text-gray-600">등록을 누르면 해당 상품이 배송중 상태로 변경됩니다. 실제 발송 또는 인계할 송장인지 확인해주세요.</p>
            <button type="button" onClick={() => submit(true)} disabled={busy || preview.ready === 0}
              className="px-5 py-2.5 rounded-lg bg-orange-500 text-white font-semibold disabled:opacity-50">
              {busy ? '등록 중...' : `${preview.ready}건 송장 등록`}
            </button>
          </div>
        )}
        {message && <p role="status" className="text-sm text-orange-700">{message}</p>}
        {errors.length > 0 && (
          <ul role="alert" className="list-disc pl-5 text-sm text-red-600 space-y-1">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
