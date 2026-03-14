'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AddressSearch } from '@/components/AddressSearch'
import { formatPhoneNumber, isValidPhoneNumber, extractPhoneNumbers } from '@/lib/utils'

interface ShippingAddress {
  id: string
  name: string
  phone: string
  addressBase: string
  addressDetail: string | null
  label: string | null
  isDefault: boolean
}

interface FormData {
  name: string
  phone: string
  addressBase: string
  addressDetail: string
  label: string
}

interface FormErrors {
  name?: string
  phone?: string
  addressBase?: string
  general?: string
}

const initialFormData: FormData = {
  name: '',
  phone: '',
  addressBase: '',
  addressDetail: '',
  label: '',
}

export default function ShippingAddressPage() {
  const { status } = useSession()
  const router = useRouter()

  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [zonecode, setZonecode] = useState('')

  // 배송지 목록 로드
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses()
    }
  }, [status])

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/shipping-addresses')
      if (res.ok) {
        const data = await res.json()
        setAddresses(data)
      }
    } catch (error) {
      console.error('배송지 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 로딩 중
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

  // 비로그인 사용자
  if (status === 'unauthenticated') {
    router.replace('/login')
    return null
  }

  // 모달 열기 (신규)
  const openAddModal = () => {
    setEditingId(null)
    setFormData(initialFormData)
    setErrors({})
    setZonecode('')
    setShowModal(true)
  }

  // 모달 열기 (수정)
  const openEditModal = (address: ShippingAddress) => {
    setEditingId(address.id)
    setFormData({
      name: address.name,
      phone: formatPhoneNumber(address.phone),
      addressBase: address.addressBase,
      addressDetail: address.addressDetail || '',
      label: address.label || '',
    })
    setErrors({})
    setZonecode('')
    setShowModal(true)
  }

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData(initialFormData)
    setErrors({})
  }

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }))
    }
  }

  // 일반 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // 주소 검색 완료 핸들러
  const handleAddressComplete = (address: string, zonecodeValue: string) => {
    setFormData((prev) => ({ ...prev, addressBase: address }))
    setZonecode(zonecodeValue)
    if (errors.addressBase) {
      setErrors((prev) => ({ ...prev, addressBase: undefined }))
    }
  }

  // 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = '수령인 이름은 2자 이상 입력해주세요.'
    }

    if (!formData.phone) {
      newErrors.phone = '전화번호를 입력해주세요.'
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = '올바른 휴대폰 번호를 입력해주세요.'
    }

    if (!formData.addressBase.trim()) {
      newErrors.addressBase = '주소를 검색해서 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 저장 (신규/수정)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const url = editingId
        ? `/api/shipping-addresses/${editingId}`
        : '/api/shipping-addresses'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: extractPhoneNumbers(formData.phone),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors({ general: data.error || '저장에 실패했습니다.' })
        return
      }

      await fetchAddresses()
      closeModal()
    } catch (error) {
      console.error('배송지 저장 오류:', error)
      setErrors({ general: '네트워크 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('이 배송지를 삭제할까요?')) return

    try {
      const res = await fetch(`/api/shipping-addresses/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchAddresses()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('배송지 삭제 오류:', error)
      alert('네트워크 오류가 발생했습니다.')
    }
  }

  // 기본 배송지 설정
  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/shipping-addresses/${id}/default`, {
        method: 'PATCH',
      })

      if (res.ok) {
        await fetchAddresses()
      } else {
        const data = await res.json()
        alert(data.error || '설정에 실패했습니다.')
      }
    } catch (error) {
      console.error('기본 배송지 설정 오류:', error)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 헤더 */}
      <div className="px-5 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl">←</span>
            </button>
            <h1 className="text-lg font-bold">배송지 관리</h1>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            + 추가
          </button>
        </div>
      </div>

      {/* 배송지 목록 */}
      <div className="px-4 py-4">
        {addresses.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500 mb-4">
              등록된 배송지가 없어요.<br />새 배송지를 추가해보세요!
            </p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-full"
            >
              배송지 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-2xl shadow-sm p-4 border-2 transition-colors ${
                  address.isDefault ? 'border-orange-400' : 'border-transparent'
                }`}
              >
                {/* 상단: 별칭 + 기본배송지 뱃지 */}
                <div className="flex items-center gap-2 mb-2">
                  {address.label && (
                    <span className="text-sm font-bold text-gray-900">
                      {address.label}
                    </span>
                  )}
                  {address.isDefault && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                      기본배송지
                    </span>
                  )}
                </div>

                {/* 수령인 정보 */}
                <p className="font-semibold text-gray-900">{address.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatPhoneNumber(address.phone)}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  {address.addressBase}
                  {address.addressDetail && `, ${address.addressDetail}`}
                </p>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="px-3 py-1.5 text-sm text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      기본으로 설정
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(address)}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    수정
                  </button>
                  {!address.isDefault && (
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* 모달 내용 */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? '배송지 수정' : '새 배송지 추가'}
              </h2>
              <button
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* 모달 폼 */}
            <form onSubmit={handleSubmit} className="px-5 py-6">
              {errors.general && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              {/* 배송지 별칭 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  배송지 별칭
                </label>
                <input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  placeholder="예: 집, 회사"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  disabled={isSubmitting}
                />
              </div>

              {/* 수령인 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  수령인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="홍길동"
                  className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* 연락처 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                    errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* 주소 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  주소 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="addressBase"
                    value={formData.addressBase}
                    readOnly
                    placeholder="주소를 검색해주세요"
                    className={`flex-1 px-4 py-3 rounded-xl border text-base bg-gray-50 ${
                      errors.addressBase ? 'border-red-400' : 'border-gray-200'
                    }`}
                    disabled={isSubmitting}
                  />
                  <AddressSearch
                    onComplete={handleAddressComplete}
                    disabled={isSubmitting}
                  />
                </div>
                {zonecode && (
                  <p className="mt-1.5 text-xs text-gray-500">우편번호: {zonecode}</p>
                )}
                {errors.addressBase && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.addressBase}</p>
                )}
              </div>

              {/* 상세주소 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  상세주소
                </label>
                <input
                  type="text"
                  name="addressDetail"
                  value={formData.addressDetail}
                  onChange={handleChange}
                  placeholder="동/호수, 건물명 등"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  disabled={isSubmitting}
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      저장 중...
                    </span>
                  ) : (
                    '저장하기'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}