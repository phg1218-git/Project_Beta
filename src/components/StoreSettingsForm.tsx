'use client'

import { useEffect, useState } from 'react'
import { defaultStoreSettings, type StoreSettingsData } from '@/lib/store-settings-data'

type TextField = Exclude<keyof StoreSettingsData, 'gapCertified' | 'shippingFee'>
const groups: { title: string; fields: { key: TextField; label: string; multiline?: boolean }[] }[] = [
  { title: '농장 소개', fields: [
    { key: 'farmName', label: '농장 / 상점 이름' }, { key: 'region', label: '농장 지역' },
    { key: 'introduction', label: '농장 이야기', multiline: true },
  ] },
  { title: '고객 문의', fields: [
    { key: 'contactPhone', label: '고객센터 전화번호' }, { key: 'contactHours', label: '상담 가능 시간' },
  ] },
  { title: '배송과 입금 안내', fields: [
    { key: 'bankAccount', label: '입금 계좌 (은행 · 계좌번호 · 예금주)' },
    { key: 'shippingNotice', label: '출고 일정과 배송 안내', multiline: true },
    { key: 'damagePolicy', label: '파손·부패 접수 및 교환·환불 안내', multiline: true },
  ] },
  { title: '서비스 정책', fields: [
    { key: 'terms', label: '이용약관', multiline: true },
    { key: 'privacyPolicy', label: '개인정보처리방침', multiline: true },
  ] },
]

export function StoreSettingsForm() {
  const [form, setForm] = useState<StoreSettingsData>({ ...defaultStoreSettings })
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        if (active) { setForm(result.data); setVersion(result.version) }
      } catch (error) {
        if (active) { setLoadFailed(true); setMessage(error instanceof Error ? error.message : '설정을 불러오지 못했습니다.') }
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving || loading || loadFailed) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: form, version }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setVersion(result.version)
      setForm(result.data)
      setMessage('저장했습니다. 고객 화면을 새로 열면 변경된 내용이 표시됩니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해주세요.')
    } finally { setSaving(false) }
  }

  if (loading) return <p role="status" className="py-8">설정을 불러오는 중...</p>
  if (loadFailed) return <div role="alert" className="py-8"><p>{message}</p><button className="mt-4 underline" onClick={() => window.location.reload()}>다시 불러오기</button></div>

  return (
    <form onSubmit={save} className="space-y-8">
      <p className="text-sm text-gray-600">저장한 내용은 고객에게 공개됩니다. 빈 항목은 고객 화면에서 숨겨집니다.</p>
      <fieldset disabled={saving} className="space-y-8 disabled:opacity-70">
        {groups.map((group) => (
          <section key={group.title} className="space-y-4 border-b border-gray-200 pb-6">
            <h2 className="text-lg font-bold">{group.title}</h2>
            {group.fields.map(({ key, label, multiline }) => (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium mb-2">{label}</label>
                {multiline ? (
                  <textarea id={key} rows={key === 'terms' || key === 'privacyPolicy' ? 8 : 4}
                    maxLength={key === 'terms' || key === 'privacyPolicy' ? 20000 : 3000}
                    value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3" />
                ) : (
                  <input id={key} required={key === 'farmName'} maxLength={key === 'farmName' ? 100 : 3000}
                    value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3" />
                )}
              </div>
            ))}
          </section>
        ))}
        <section className="space-y-3 border-b border-gray-200 pb-6">
          <h2 className="text-lg font-bold">배송비</h2>
          <label htmlFor="shippingFee" className="block text-sm">주문 1건당 기본 배송비 (원)</label>
          <input id="shippingFee" type="number" min={0} max={1000000} step={1} required value={form.shippingFee}
            onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg p-3" />
          <p className="text-sm text-gray-500">0원은 무료배송입니다. 변경 후 새 주문부터 적용하며 기존 주문 금액은 바뀌지 않습니다. 지역별 추가요금은 현재 지원하지 않습니다.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">GAP 인증 표시</h2>
          <p className="text-sm text-gray-600">인증 여부를 모르면 꺼두세요. 인증이 확인된 경우에만 내용과 표시 여부를 설정합니다.</p>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.gapCertified} onChange={(e) => setForm({ ...form, gapCertified: e.target.checked })} />
            확인된 GAP 인증 정보를 고객에게 표시
          </label>
          <label htmlFor="gapCertification" className="block text-sm">인증번호 · 대상 · 유효기간 등 확인한 내용</label>
          <textarea id="gapCertification" rows={3} maxLength={3000} required={form.gapCertified}
            value={form.gapCertification} onChange={(e) => setForm({ ...form, gapCertification: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3" />
        </section>
      </fieldset>
      {message && <p role="status" className="text-sm p-3 bg-orange-50 rounded-lg">{message}</p>}
      <button disabled={saving} className="px-6 py-3 bg-orange-500 text-white rounded-lg font-bold disabled:opacity-50">
        {saving ? '저장 중...' : '설정 저장'}
      </button>
    </form>
  )
}
