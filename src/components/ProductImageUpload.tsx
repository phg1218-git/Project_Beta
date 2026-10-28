'use client'
import { useState } from 'react'
import { validateImageFile } from '@/lib/product-image'

export function ProductImageUpload({ value, onChange, onBusyChange, disabled }: {
  value: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void; disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file: File) {
    const problem = validateImageFile(file)
    if (problem) { setError(problem); return }
    setBusy(true); onBusyChange(true); setError('')
    try {
      const data = new FormData(); data.append('file', file)
      const response = await fetch('/api/admin/product-images', { method: 'POST', body: data })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '사진 업로드에 실패했습니다.')
      onChange(result.imageUrl)
    } catch (e) { setError(e instanceof Error ? e.message : '업로드에 실패했습니다.') }
    finally { setBusy(false); onBusyChange(false) }
  }
  return <div className="space-y-3">
    <label className="block text-sm font-semibold">상품 사진
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} className="block w-full mt-2 text-sm" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file) }} />
    </label>
    <p className="text-xs text-gray-500">JPG·PNG·WebP, 최대 3MB. 사진 선택 후 상품을 저장해주세요.</p>
    {value && <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value} alt="상품 사진 미리보기" className="w-48 h-48 rounded-xl object-cover border" />
      <button type="button" disabled={disabled || busy} onClick={() => onChange('')} className="text-sm text-red-600">사진 제거</button>
    </div>}
    <p role="status" className={error ? 'text-sm text-red-600' : 'text-sm text-gray-500'}>{busy ? '사진 업로드 중…' : error}</p>
  </div>
}
