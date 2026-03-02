'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'

const MOCK_CART = [
  { id: '1', name: '제주 황금 노지귤 5kg', price: 18900, qty: 2, emoji: '🍊' },
  { id: '2', name: '천혜향 프리미엄 3kg', price: 32000, qty: 1, emoji: '🟠' },
]

export default function CartPage() {
  const [items, setItems] = useState(MOCK_CART)

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, qty: Math.max(1, Math.min(99, item.qty + delta)) }
          : item
      )
    )
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  if (items.length === 0) {
    return (
      <div style={{ padding: '64px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          아직 담은 상품이 없어요.<br />달콤한 귤을 골라보세요 🍊
        </p>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <div
        style={{
          padding: '20px 16px 12px',
          background: 'white',
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🛒 장바구니</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {items.length}개 상품이 담겨 있어요
        </p>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'white',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              padding: 16,
              display: 'flex',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 64, height: 64, borderRadius: 12,
                background: 'linear-gradient(135deg,#FFF3E0,#FFE0B2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
              }}
            >
              {item.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                {formatPrice(item.price * item.qty)}
              </div>
              {/* 수량 조절 */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg)', borderRadius: 10,
                  padding: '4px 8px', marginTop: 8, width: 'fit-content',
                }}
              >
                <button
                  onClick={() => updateQty(item.id, -1)}
                  style={{
                    width: 28, height: 28, border: 'none', background: 'none',
                    fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    color: 'var(--primary)', borderRadius: 8,
                  }}
                >−</button>
                <span style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                  {item.qty}
                </span>
                <button
                  onClick={() => updateQty(item.id, 1)}
                  style={{
                    width: 28, height: 28, border: 'none', background: 'none',
                    fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    color: 'var(--primary)', borderRadius: 8,
                  }}
                >+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky 결제 바 */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          background: 'white',
          borderTop: '1px solid var(--neutral-200)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 150,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>총 결제 예정금액</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{formatPrice(total)}</div>
        </div>
        <button
          style={{
            background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700,
            padding: '12px 24px', cursor: 'pointer',
          }}
        >
          선택 상품 주문하기
        </button>
      </div>
    </div>
  )
}
