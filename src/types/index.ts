import type { OrderStatus, Role } from '@prisma/client'

export type { OrderStatus, Role }

export interface UserSession {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: Role
  profileComplete: boolean
}

export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  imageUrl?: string | null
  recipientName: string
  recipientPhone: string
  recipientAddressBase: string
  recipientAddressDetail?: string
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT:             '입금요청 전',
  DEPOSIT_REQUESTED: '입금확인 요청 중',
  PAYMENT_CONFIRMED: '배송 준비 중',
  SHIPPING:          '배송 중',
  DELIVERED:         '배송 완료',
  CANCELED:          '취소됨',
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT:             'bg-gray-100 text-gray-600',
  DEPOSIT_REQUESTED: 'bg-yellow-100 text-yellow-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPING:          'bg-orange-100 text-orange-700',
  DELIVERED:         'bg-green-100 text-green-700',
  CANCELED:          'bg-red-100 text-red-600',
}
