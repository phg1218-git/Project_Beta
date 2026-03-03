import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원'
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 전화번호에서 숫자만 추출
 * @param phone - 입력된 전화번호 문자열
 * @returns 숫자만 포함된 문자열
 */
export function extractPhoneNumbers(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

/**
 * 전화번호를 010-0000-0000 형식으로 포맷팅
 * @param phone - 숫자만 포함된 전화번호 또는 하이픈 포함 전화번호
 * @returns 포맷팅된 전화번호 (예: 010-1234-5678)
 */
export function formatPhoneNumber(phone: string): string {
  const numbers = extractPhoneNumbers(phone)
  
  if (numbers.length <= 3) {
    return numbers
  }
  if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  }
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
}

/**
 * 전화번호 유효성 검사 (한국 휴대폰 번호 기준)
 * @param phone - 검사할 전화번호
 * @returns 유효하면 true, 아니면 false
 */
export function isValidPhoneNumber(phone: string): boolean {
  const numbers = extractPhoneNumbers(phone)
  // 010으로 시작하는 11자리 숫자
  return /^010\d{8}$/.test(numbers)
}