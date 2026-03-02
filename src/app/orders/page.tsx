import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import type { OrderStatus } from '@/types'

const MOCK_ORDERS = [
  {
    id: 'ord-1',
    createdAt: '2025. 01. 15',
    orderNo: '#ORD-2025011500123',
    productName: '제주 황금 노지귤 5kg × 2',
    totalAmount: 37800,
    status: 'SHIPPING' as OrderStatus,
  },
  {
    id: 'ord-2',
    createdAt: '2025. 01. 10',
    orderNo: '#ORD-2025011000087',
    productName: '천혜향 프리미엄 3kg × 1',
    totalAmount: 32000,
    status: 'DRAFT' as OrderStatus,
  },
  {
    id: 'ord-3',
    createdAt: '2025. 01. 03',
    orderNo: '#ORD-2025010300042',
    productName: '레드향 10kg × 1',
    totalAmount: 45000,
    status: 'DELIVERED' as OrderStatus,
  },
]

export default function OrdersPage() {
  return (
    <div className="page-enter">
      <div
        style={{
          padding: '20px 16px 12px',
          background: 'white',
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>📦 주문 내역</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          최근 주문을 확인하세요
        </p>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {MOCK_ORDERS.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              아직 주문 내역이 없어요. 첫 주문을 해보세요!
            </p>
          </div>
        ) : (
          MOCK_ORDERS.map((order) => (
            <div
              key={order.id}
              style={{
                background: 'white',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-card)',
                padding: 16,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12, paddingBottom: 12,
                  borderBottom: '1px solid var(--neutral-100)',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.createdAt}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.orderNo}</div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{order.productName}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                {order.totalAmount.toLocaleString()}원
              </div>

              {/* 상태별 액션 버튼 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {order.status === 'DRAFT' && (
                  <>
                    <ActionBtn label="주문 수정" variant="outline" />
                    <ActionBtn label="주문 취소" variant="outline" />
                    <ActionBtn label="입금확인 요청" variant="primary" />
                  </>
                )}
                {(order.status === 'SHIPPING' || order.status === 'DELIVERED') && (
                  <ActionBtn label="배송 조회" variant="outline" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, variant }: { label: string; variant: 'outline' | 'primary' }) {
  const isPrimary = variant === 'primary'
  return (
    <button
      style={{
        flex: 1, padding: '9px 0',
        borderRadius: 10, fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
        background: isPrimary ? 'var(--primary)' : 'white',
        color: isPrimary ? 'white' : 'var(--text-primary)',
        border: isPrimary ? 'none' : '1.5px solid var(--neutral-200)',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}
