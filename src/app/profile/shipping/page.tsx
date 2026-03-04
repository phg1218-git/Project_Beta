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

interface ShippingAddress {
  id: string
  name: string
  phone: string
  addressBase: string
  addressDetail: string
  label: string | null
  isDefault: boolean
}

export default function ShippingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    addressBase: '',
    addressDetail: '',
    label: '',
    isDefault: false,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAddresses()
    }
  }, [status, router])

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/shipping')
      if (res.ok) {
        const data = await res.json()
        setAddresses(data)
      }
    } catch (error) {
      console.error('배송지 조회 실패:', error)
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

  const openModal = (address?: ShippingAddress) => {
    if (address) {
      setEditingAddress(address)
      setForm({
        name: address.name,
        phone: address.phone,
        addressBase: address.addressBase,
        addressDetail: address.addressDetail || '',
        label: address.label || '',
        isDefault: address.isDefault,
      })
    } else {
      setEditingAddress(null)
      setForm({
        name: '',
        phone: '',
        addressBase: '',
        addressDetail: '',
        label: '',
        isDefault: addresses.length === 0,
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingAddress(null)
  }

  const handleSubmit = async () => {
    const phoneRegex = /^010-\d{4}-\d{4}$/
    if (!form.name || !form.phone || !form.addressBase) {
      alert('필수 정보를 입력해주세요.')
      return
    }
    if (!phoneRegex.test(form.phone)) {
      alert('올바른 휴대폰 번호 형식이 아닙니다.')
      return
    }

    try {
      if (editingAddress) {
        await fetch(`/api/shipping/${editingAddress.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      await fetchAddresses()
      closeModal()
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했어요.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 배송지를 삭제할까요?')) return

    try {
      await fetch(`/api/shipping/${id}`, { method: 'DELETE' })
      await fetchAddresses()
    } catch (error) {
      console.error('삭제 실패:', error)
    }
  }

  const setAsDefault = async (id: string) => {
    try {
      await fetch(`/api/shipping/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      await fetchAddresses()
    } catch (error) {
      console.error('기본 배송지 설정 실패:', error)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
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
        <div className="px-4 py-5 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-xl">←</button>
            <h1 className="text-xl font-bold">배송지 관리</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="px-3 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-lg"
          >
            + 추가
          </button>
        </div>

        <div className="p-4">
          {addresses.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-gray-500 mb-4">등록된 배송지가 없어요.</p>
              <button
                onClick={() => openModal()}
                className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-full"
              >
                배송지 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-2xl shadow-sm p-4 border-2 ${
                    addr.isDefault ? 'border-orange-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded">
                          기본
                        </span>
                      )}
                      {addr.label && (
                        <span className="text-sm text-gray-500">{addr.label}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(addr)}
                        className="text-sm text-blue-500"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="text-sm text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <p className="font-semibold">{addr.name}</p>
                  <p className="text-sm text-gray-600">{addr.phone}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {addr.addressBase} {addr.addressDetail}
                  </p>
                  {!addr.isDefault && (
                    <button
                      onClick={() => setAsDefault(addr.id)}
                      className="mt-3 text-sm text-orange-500 font-medium"
                    >
                      기본 배송지로 설정
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 추가/수정 모달 */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">
                    {editingAddress ? '배송지 수정' : '새 배송지 추가'}
                  </h2>
                  <button onClick={closeModal} className="text-2xl text-gray-400">×</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      별칭 (선택)
                    </label>
                    <input
                      type="text"
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="예: 집, 회사"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      수령인 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="받으실 분 이름"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연락처 <span className="text-red-500">*</span>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      상세주소
                    </label>
                    <input
                      type="text"
                      value={form.addressDetail}
                      onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                      placeholder="동/호수 등"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm font-medium">기본 배송지로 설정</span>
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}