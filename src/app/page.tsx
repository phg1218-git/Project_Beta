import { redirect } from 'next/navigation'

// 메인 진입점 → 상품 목록으로 리다이렉트
export default function HomePage() {
  redirect('/products')
}
