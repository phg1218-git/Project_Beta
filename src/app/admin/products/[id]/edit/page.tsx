'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface ProductForm {
  name: string
  description: string
  price: string
  stock: string
  imageUrl: string
}

interface FormErrors {
  name?: string
  price?: string
  stock?: string
  general?: string
}

export default function AdminProductEditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    stock: '',
    imageUrl: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (
      status === 'unauthenticated' ||
      (status === 'authenticated' && session?.user?.role !== 'ADMIN')
    ) {
      router.replace('/')
      return
    }
    if (status === 'authenticated') {
      fetchProduct()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/admin/products/${productId}`)
      if (!res.ok) {
        router.replace('/admin/products')
        return
      }
      const data = await res.json()
      setForm({
        name: data.name ?? '',
        description: data.description ?? '',
        price: String(data.price ?? ''),
        stock: String(data.stock ?? ''),
        imageUrl: data.imageUrl ?? '',
      })
    } catch {
      router.replace('/admin/products')
    } finally {
      setIsLoading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!form.name.trim() || form.name.trim().length < 2) {
      newErrors.name = '상품명은 2자 이상 입력해주세요.'
    }
    const priceNum = Number(form.price)
    if (!form.price || !Number.isFinite(priceNum) || priceNum < 0) {
      newErrors.price = '가격은 0 이상의 숫자여야 합니다.'
    }
    const stockNum = Number(form.stock)
    if (form.stock === '' || !Number.isInteger(stockNum) || stockNum < 0) {
      newErrors.stock = '재고는 0 이상의 정수여야 합니다.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    setErrors({})
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          stock: Number(form.stock),
          imageUrl: form.imageUrl.trim() || null,
        }),
      })
      if (res.ok) {
        router.push('/admin/products')
      } else {
        const data = await res.json()
        setErrors({ general: data.error || '수정에 실패했습니다.' })
      }
    } catch {
      setErrors({ general: '네트워크 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍊</div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🍊 상품 수정</h1>
          <p className="text-gray-500 text-sm mt-0.5">상품 정보를 수정하세요</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {errors.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              상품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="예: 제주 감귤 5kg"
              className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
              }`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              설명
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="상품 설명을 입력해주세요"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                가격 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="30000"
                min={0}
                className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                  errors.price ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                }`}
                disabled={isSubmitting}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-500">{errors.price}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                재고 (개) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="100"
                min={0}
                step={1}
                className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                  errors.stock ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                }`}
                disabled={isSubmitting}
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-red-500">{errors.stock}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              이미지 URL
            </label>
            <input
              type="text"
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {isSubmitting ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
