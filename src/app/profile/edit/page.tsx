'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
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

export default function ProfileEditPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    addressBase: '',
    addressDetail: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          addressBase: data.addressBase || '',
          addressDetail: data.addressDetail || '',
        })
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error)
    } finally {
      setLoading(false)
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
    setForm({ ...form, phone: formatted })
  }

  const openAddressSearch = () => {
    if (!window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        setForm({ ...form, addressBase: data.address })
      },
    }).open()
  }

  const handleSubmit = async () => {
    const phoneRegex = /^010-\d{4}-\d{4}$/
    if (!form.name) {
      alert('이름을 입력해주세요.')
      return
    }
    if (!phoneRegex.test(form.phone)) {
      alert('올바른 휴대폰 번호 형식이 아닙니다. (010-0000-0000)')
      return
    }
    if (!form.addressBase) {
      alert('주소를 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, profileComplete: true }),
      })

      if (res.ok) {
        alert('회원정보가 저장되었어요! 🍊')
        router.push('/profile')
      } else {
        alert('저장에 실패했어요.')
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('오류가 발생했어요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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

      <div className="min-h-screen pb-24">
        {/* 헤더 */}
        <div className="px-4 py-5 bg-white border-b border-gray-200 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-xl">←</button>
          <h1 className="text-xl font-bold">회원정보 수정</h1>
        </div>

        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            {/* 프로필 이미지 */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
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
            </div>

            {/* 이메일 (수정불가) */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">이메일</label>
              <input
                type="email"
                value={session?.user?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500"
              />
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="이름을 입력해주세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* 휴대폰 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-0000-0000"
                maxLength={13}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.addressBase}
                  readOnly
                  placeholder="주소를 검색해주세요"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer"
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
                value={form.addressDetail}
                onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                placeholder="동/호수 등"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* 배송지 관리 링크 */}
          <Link
            href="/profile/shipping"
            className="mt-4 flex items-center justify-between bg-white rounded-2xl shadow-sm p-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="font-medium">배송지 관리</span>
            </div>
            <span className="text-gray-400">→</span>
          </Link>
        </div>

        {/* 저장 버튼 */}
        <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </>
  )
}