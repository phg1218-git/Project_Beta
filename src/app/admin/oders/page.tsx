import { redirect } from 'next/navigation'

// /admin/oders 는 오타 라우트 — /admin/orders 로 영구 리다이렉트
export default function AdminOdersRedirectPage() {
  redirect('/admin/orders')
}
