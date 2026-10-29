"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LoadingOverlay } from '@/components/LoadingOverlay'
const labels = {title:'메인 제목',introduction:'메인 소개',storyTitle:'만생귤 소개 제목',story:'만생귤 소개 내용'}
type Content = Record<keyof typeof labels,string>
export default function Page() {
 const [form,setForm] = useState<Content | null>(null)
 const [message,setMessage] = useState('')
 const [saving,setSaving] = useState(false)
 useEffect(() => { fetch('/api/admin/content').then(async r => {if (!r.ok) throw Error();setForm(await r.json())}).catch(() => setMessage('불러오기 실패. 새로고침해 주세요.')) },[])
 async function save(e: React.FormEvent) {
 e.preventDefault();setSaving(true)
 try {const r=await fetch('/api/admin/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});if (!r.ok) throw Error();setMessage('저장했습니다. 메인에 바로 반영됩니다.')} catch {setMessage('저장 실패. 다시 시도해 주세요.')} finally {setSaving(false)}
 }
 return <div className="max-w-3xl mx-auto p-6">{saving && <LoadingOverlay message="메인 소개를 저장하는 중..." />}<Link href="/admin">← 관리자</Link><h1 className="text-2xl font-bold my-6">메인 소개 설정</h1><p role="status">{message}</p>{form && <form onSubmit={save} className="space-y-6">{(Object.keys(labels) as (keyof Content)[]).map(k => <label key={k} className="block">{labels[k]}<textarea required maxLength={5000} rows={5} className="block w-full border rounded-lg p-3" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}/></label>)}<button disabled={saving} className="bg-orange-500 text-white rounded-lg px-6 py-3">{saving?'저장 중…':'저장'}</button> <Link href="/" target="_blank">메인 확인</Link></form>}</div>
}
