import { createHash } from 'node:crypto'

export function orderRequestId(userId: string, key: string) {
  return 'req_' + createHash('sha256').update(JSON.stringify([userId, key])).digest('hex')
}

interface PurchaseItem {
  productId: string
  quantity: number
  recipientName: string
  recipientPhone: string
  recipientAddressBase: string
  recipientAddressDetail: string | null
}

export function samePurchase(
  existing: { depositorName: string | null; items: PurchaseItem[] },
  incoming: { depositorName: string | null; items: PurchaseItem[] },
) {
  const canonical = (items: PurchaseItem[]) => JSON.stringify(items.map((item) => [
    item.productId, item.quantity, item.recipientName, item.recipientPhone,
    item.recipientAddressBase, item.recipientAddressDetail || null,
  ]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
  return existing.depositorName === incoming.depositorName && canonical(existing.items) === canonical(incoming.items)
}
