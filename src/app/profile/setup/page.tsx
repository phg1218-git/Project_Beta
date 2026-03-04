'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Script from 'next/script'

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: { address: string; zonecode: string }) => void
      }) => { open: () => void }
    }
  }
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressBase: '',
    addressDetail: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)

  // 이미 프로필 완성된 사용자는 메인으로
  useEffect(() => {
    if (status === 'authenticated') {
      checkProfile()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status])

  const checkProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        // 이미 정보가 있으면 메인으로 이동
        if (data.profileComplete || (data.name && data.phone && data.addressBase)) {
          router.push('/')
          return
        }
        // 소셜 로그인 정보로 이름 자동 완성
        setFormData((prev) => ({
          ...prev,
          name: data.name || session?.user?.name || '',
        }))
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async () => {
    const phoneRegex = /^010-\d{4}-\d{4}$/
    
    if (!formData.name) {
      alert('이름을 입력해주세요.')
      return
    }
    if (!phoneRegex.test(formData.phone)) {
      alert('올바른 휴대폰 번호 형식이 아닙니다. (010-0000-0000)')
      return
    }
    if (!formData.addressBase) {
      alert('주소를 검색해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, profileComplete: true }),
      })

      if (!res.ok) throw new Error('프로필 저장 실패')

      await update({ profileComplete: true })
      
      alert('정보가 저장되었어요! 🍊')
      window.location.href = '/'
    } catch (error) {
      console.error(error)
      alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '').slice(0, 11)
    let formatted = numbers
    if (numbers.length > 3 && numbers.length <= 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length > 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    setFormData({ ...formData, phone: formatted })
  }

  const openAddressSearch = () => {
    if (!window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        setFormData({ ...formData, addressBase: data.address })
      },
    }).open()
  }

  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍊</div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8 px-4">
        <div className="max-w-md mx-auto">
          {/* 로고 */}
          <div className="text-center mb-8">
            <span className="text-5xl">🍊</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">배송 정보 등록</h1>
            <p className="text-gray-500 mt-2">
              최초 1회만 입력하면 주문 시 자동으로 연동됩니다
            </p>
          </div>

          {/* 폼 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="실명을 입력해주세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            {/* 휴대폰 번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-0000-0000"
                maxLength={13}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">숫자만 입력하면 자동으로 형식이 맞춰져요</p>
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.addressBase}
                  readOnly
                  placeholder="주소를 검색해주세요"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 cursor-pointer"
                  onClick={openAddressSearch}
                />
                <button
                  type="button"
                  onClick={openAddressSearch}
                  className="px-4 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600"
                >
                  검색
                </button>
              </div>
            </div>

            {/* 상세주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상세주소</label>
              <input
                type="text"
                value={formData.addressDetail}
                onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                placeholder="동/호수 등 상세주소"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-4 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장하고 시작하기'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            나중에 마이페이지에서 수정할 수 있어요
          </p>
        </div>
      </div>
    </>
  )
}