import Link from 'next/link'
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/admin-auth'
import { StoreSettingsForm } from '@/components/StoreSettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  if (!await adminAuth()) redirect('/')
  return <div className="max-w-3xl mx-auto p-4 md:p-8 pb-16">
    <Link href="/admin" className="text-sm text-gray-600">← 관리자 홈</Link>
    <h1 className="text-2xl font-bold mt-4 mb-6">농장·판매 설정</h1>
    <StoreSettingsForm />
  </div>
}
