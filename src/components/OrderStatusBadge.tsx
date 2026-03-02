import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, type OrderStatus } from '@/types'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        ORDER_STATUS_COLOR[status]
      )}
      aria-label={`주문 상태: ${ORDER_STATUS_LABEL[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
