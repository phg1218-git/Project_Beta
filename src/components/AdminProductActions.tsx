'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  isActive: boolean
}

export function AdminProductActions({ product }: { product: Product }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleActive = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('처리에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${product.name}" 상품을 삭제할까요? 삭제하면 복구할 수 없습니다.`)) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/products/${product.id}/edit`}
        className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        수정
      </Link>
      <button
        onClick={handleToggleActive}
        disabled={isLoading}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 ${
          product.isActive
            ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200'
            : 'text-green-600 bg-green-100 hover:bg-green-200'
        }`}
      >
        {product.isActive ? '숨김' : '노출'}
      </button>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
      >
        삭제
      </button>
    </div>
  )
}