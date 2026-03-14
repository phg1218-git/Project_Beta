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

export default function ProfileSetupPage() {
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
  const [zonecode, setZonecode] = useState('')

  // 세션에서 초기값 설정
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || '',
      }))
    }
  }, [session])

  // 이미 프로필 완성된 사용자는 메인으로 리다이렉트
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profileComplete) {
      router.replace('/products')
    }
  }, [status, session, router])

  // 로딩 중
  if (status === 'loading') {
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
    
    // 에러 클리어
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }))
    }
  }

  // 일반 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // 에러 클리어
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // 주소 검색 완료 핸들러
  const handleAddressComplete = (address: string, zonecodeValue: string) => {
    setFormData((prev) => ({ ...prev, addressBase: address }))
    setZonecode(zonecodeValue)
    
    // 에러 클리어
    if (errors.addressBase) {
      setErrors((prev) => ({ ...prev, addressBase: undefined }))
    }
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

    try {
      const res = await fetch('/api/profile/setup', {
        method: 'POST',
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

      // 세션 업데이트 (profileComplete 등 반영)
      await update({
        profileComplete: true,
        phone: formData.phone,
        addressBase: formData.addressBase,
        addressDetail: formData.addressDetail,
      })

      // 성공 시 메인 페이지로 이동
      router.replace('/products')
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
      <div
        className="px-5 pt-8 pb-6 text-white text-center"
        style={{
          background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)',
        }}
      >
        <div className="text-4xl mb-3">🍊</div>
        <h1 className="text-xl font-bold mb-2">프로필을 먼저 입력해 주세요</h1>
        <p className="text-sm text-white/80">
          주문 및 배송을 위해 기본 정보가 필요합니다
        </p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="px-5 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center">
              1
            </span>
            <span className="text-sm font-semibold text-gray-900">기본정보 입력</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-sm font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-sm text-gray-400">완료</span>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="px-5 py-6">
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

        {/* 안내 문구 */}
        <div className="mb-6 p-4 bg-orange-50 rounded-xl">
          <p className="text-sm text-orange-700 leading-relaxed">
            💡 입력하신 정보는 주문 시 자동으로 연동됩니다.<br />
            나중에 마이페이지에서 수정할 수 있어요.
          </p>
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
            '저장하고 시작하기'
          )}
        </button>
      </form>
    </div>
  )
}