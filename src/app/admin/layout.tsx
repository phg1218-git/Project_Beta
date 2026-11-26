import { adminAuth } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!await adminAuth()) redirect('/')
  return <>{children}</>
}
