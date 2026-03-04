'use client'

import { useState, useEffect } from 'react'

interface Member {
  id: string
  name: string | null
  email: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  _count: { orders: number }
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/admin/members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('회원 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = members.filter(
    (m) =>
      (m.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.email?.toLowerCase() || '').includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <p className="text-gray-500">총 {members.length}명</p>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">👥</div>
          <p>등록된 회원이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">이름</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">이메일</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">등급</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">주문수</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">가입일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm font-medium">
                    {member.name || '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {member.email || '-'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role === 'ADMIN' ? '관리자' : '일반'}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{member._count.orders}건</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(member.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
