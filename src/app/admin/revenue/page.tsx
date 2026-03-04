'use client'

import { useState, useEffect } from 'react'

interface RevenueData {
  totalRevenue: number
  totalOrders: number
  avgOrderAmount: number
  dailyData: { date: string; revenue: number; orders: number }[]
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    fetchRevenue()
  }, [period])

  const fetchRevenue = async () => {
    try {
      const res = await fetch(`/api/admin/revenue?period=${period}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('수익 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  const hasData = data && data.totalOrders > 0

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">수익 통계</h1>

      {/* 기간 토글 */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'daily', label: '일별' },
          { value: 'weekly', label: '주별' },
          { value: 'monthly', label: '월별' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as 'daily' | 'weekly' | 'monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📊</div>
          <p>선택한 기간에 입금 확인된 주문이 없어요.</p>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-500 mb-1">총 수익</p>
              <p className="text-2xl font-bold text-orange-500">
                {data.totalRevenue.toLocaleString()}원
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-500 mb-1">총 주문</p>
              <p className="text-2xl font-bold">{data.totalOrders}건</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-500 mb-1">평균 주문금액</p>
              <p className="text-2xl font-bold">
                {Math.round(data.avgOrderAmount).toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 차트 대신 테이블 */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">날짜</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">수익</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">주문수</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyData.map((row) => (
                  <tr key={row.date} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-sm">{row.date}</td>
                    <td className="p-4 text-sm font-semibold text-orange-500">
                      {row.revenue.toLocaleString()}원
                    </td>
                    <td className="p-4 text-sm">{row.orders}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
