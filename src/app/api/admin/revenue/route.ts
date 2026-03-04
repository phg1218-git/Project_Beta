import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'daily'

    // 입금 확인된 주문만 조회
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'SHIPPING', 'DELIVERED'] },
      },
      select: {
        totalAmount: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalOrders = orders.length
    const avgOrderAmount = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // 일별 데이터 집계
    const dailyMap = new Map<string, { revenue: number; orders: number }>()
    
    orders.forEach((order) => {
      const date = new Date(order.paidAt || order.createdAt)
      let key: string

      if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (period === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        key = date.toISOString().split('T')[0]
      }

      const existing = dailyMap.get(key) || { revenue: 0, orders: 0 }
      dailyMap.set(key, {
        revenue: existing.revenue + order.totalAmount,
        orders: existing.orders + 1,
      })
    })

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      avgOrderAmount,
      dailyData,
    })
  } catch (error) {
    console.error('Admin revenue GET error:', error)
    return NextResponse.json({
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderAmount: 0,
      dailyData: [],
    })
  }
}
