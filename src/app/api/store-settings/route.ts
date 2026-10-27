import { NextResponse } from 'next/server'
import { getStoreSettings } from '@/lib/store-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await getStoreSettings()
    return NextResponse.json({ shippingFee: settings.shippingFee }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '배송비를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.' }, { status: 503 })
  }
}
