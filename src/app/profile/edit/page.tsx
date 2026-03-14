'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AddressSearch } from '@/components/AddressSearch'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils'

interface FormData {
  name: string
  phone: string
  addressBase: string
  addressDetail: string
}

interface FormErrors {
  name?: string
  phone?: string
  addressBase?: string
  general?: string
}

export default function ProfileEditPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    addressBase: '',
    addressDetail: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [zonecode, setZonecode] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 기존 프로필 정보 로드
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile/setup')
      if (res.ok) {
        const data = await res.json()
        setFormData({
          name: data.name || '',
          phone: data.phone ? formatPhoneNumber(data.phone) : '',
          addressBase: data.addressBase || '',
          addressDetail: data.addressDetail || '',
        })
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error)
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

  // 전화번호 입력 핸들러 (숫자만 + 자동 포맷팅)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }))
    }
    setSaveSuccess(false)
  }

  // 일반 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    setSaveSuccess(false)
  }

  // 주소 검색 완료 핸들러
  const handleAddressComplete = (address: string, zonecodeValue: string) => {
    setFormData((prev) => ({ ...prev, addressBase: address }))
    setZonecode(zonecodeValue)

    if (errors.addressBase) {
      setErrors((prev) => ({ ...prev, addressBase: undefined }))
    }
    setSaveSuccess(false)
  }

  // 클라이언트 측 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = '이름은 2자 이상 입력해주세요.'
    }

    if (!formData.phone) {
      newErrors.phone = '전화번호를 입력해주세요.'
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = '올바른 휴대폰 번호를 입력해주세요. (010-0000-0000)'
    }

    if (!formData.addressBase.trim()) {
      newErrors.addressBase = '주소를 검색해서 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setSaveSuccess(false)

    try {
      const res = await fetch('/api/profile/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ general: data.error || '저장에 실패했습니다.' })
        }
        return
      }

      // 세션 업데이트
      await update({
        name: formData.name,
        phone: formData.phone,
        addressBase: formData.addressBase,
        addressDetail: formData.addressDetail,
      })

      setSaveSuccess(true)

      // 2초 후 성공 메시지 숨김
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('프로필 저장 오류:', error)
      setErrors({ general: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 헤더 */}
      <div className="px-5 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          <h1 className="text-lg font-bold">회원정보 수정</h1>
        </div>
      </div>

      {/* 프로필 이미지 섹션 */}
      <div className="px-5 py-6 bg-white border-b border-gray-100 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-3">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt="프로필"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-3xl">👤</span>
          )}
        </div>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="px-5 py-6">
        {/* 성공 메시지 */}
        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-600 flex items-center gap-2">
              <span>✓</span> 프로필이 저장되었습니다.
            </p>
          </div>
        )}

        {/* 일반 오류 메시지 */}
        {errors.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* 이름 */}
        <div className="mb-5">
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="홍길동"
            className={`
              w-full px-4 py-3 rounded-xl border text-base
              transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20
              ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}
            `}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* 전화번호 */}
        <div className="mb-5">
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
            휴대폰 번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength={13}
            className={`
              w-full px-4 py-3 rounded-xl border text-base
              transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20
              ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}
            `}
            disabled={isSubmitting}
          />
          {errors.phone && (
            <p className="mt-1.5 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* 주소 */}
        <div className="mb-5">
          <label htmlFor="addressBase" className="block text-sm font-semibold text-gray-700 mb-2">
            주소 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="addressBase"
              name="addressBase"
              value={formData.addressBase}
              readOnly
              placeholder="주소를 검색해주세요"
              className={`
                flex-1 px-4 py-3 rounded-xl border text-base bg-gray-50
                ${errors.addressBase ? 'border-red-400' : 'border-gray-200'}
              `}
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
        <div className="mb-8">
          <label htmlFor="addressDetail" className="block text-sm font-semibold text-gray-700 mb-2">
            상세주소
          </label>
          <input
            type="text"
            id="addressDetail"
            name="addressDetail"
            value={formData.addressDetail}
            onChange={handleChange}
            placeholder="동/호수, 건물명 등"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            disabled={isSubmitting}
          />
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all
            ${isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]'
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              저장 중...
            </span>
          ) : (
            '저장하기'
          )}
        </button>
      </form>

      {/* 하단 링크 */}
      <div className="px-5 pb-8">
        <button
          onClick={() => router.push('/profile/shipping')}
          className="w-full py-3 text-center text-sm text-gray-500 hover:text-orange-500 transition-colors"
        >
          배송지 관리 →
        </button>
      </div>
    </div>
  )
}