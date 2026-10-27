import Link from 'next/link'
import type { StoreSettingsData } from '@/lib/store-settings-data'

export function StoreFooter({ settings }: { settings: StoreSettingsData }) {
  return <footer className="px-6 pt-8 pb-28 bg-gray-900 text-gray-300 text-center text-sm space-y-2">
    <p>{settings.farmName}{settings.region && ` | ${settings.region}`}</p>
    {settings.contactPhone && <p><a href={`tel:${settings.contactPhone.replace(/[^+0-9]/g, '')}`}>고객센터: {settings.contactPhone}</a></p>}
    {settings.contactHours && <p>{settings.contactHours}</p>}
    <div className="flex flex-wrap justify-center gap-4 pt-3">
      <Link href="/support">배송·고객 안내</Link>
      {settings.terms && <Link href="/policies/terms">이용약관</Link>}
      {settings.privacyPolicy && <Link href="/policies/privacy">개인정보처리방침</Link>}
    </div>
  </footer>
}
