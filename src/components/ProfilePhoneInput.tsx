'use client'
import { formatPhoneSuffix } from '@/lib/profile-validation'

export function ProfilePhoneInput({ value, onChange, disabled, invalid }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean
}) {
  return <div className={`flex items-center rounded-xl border bg-white ${invalid ? 'border-red-400' : 'border-gray-200'}`}>
    <span className="pl-4 text-gray-600" aria-hidden="true">010-</span>
    <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
      aria-label="휴대폰 번호, 010 뒤 8자리" aria-invalid={invalid} required pattern="[0-9]{4}-[0-9]{4}"
      value={value.startsWith('010-') ? value.slice(4) : ''} placeholder="1234-5678" disabled={disabled}
      onChange={e => onChange(`010-${formatPhoneSuffix(e.target.value)}`)}
      className="w-full min-w-0 p-3 rounded-r-xl outline-none focus:ring-2 focus:ring-orange-400" />
  </div>
}
