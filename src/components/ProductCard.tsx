import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  imageUrl?: string | null
  [key: string]: unknown
}

const PRODUCT_EMOJIS = ['🍊', '🟠', '🍋', '🎁', '🍊', '🟠']

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const isSoldOut = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 5
  const emoji = (product as Record<string, unknown>)._emoji as string ?? PRODUCT_EMOJIS[index % PRODUCT_EMOJIS.length]
  const badge = (product as Record<string, unknown>)._badge as string | null ?? null

  return (
    <Link
      href={`/products/${product.id}`}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        opacity: isSoldOut ? 0.85 : 1,
        transition: 'transform 0.25s, box-shadow 0.25s',
        position: 'relative',
      }}
    >
      {/* 상품 이미지 영역 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52,
          position: 'relative',
        }}
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          emoji
        )}

        {/* BEST/NEW 배지 */}
        {badge && (
          <span
            style={{
              position: 'absolute', top: 8, left: 8,
              background: 'var(--primary)', color: 'white',
              fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 20,
            }}
          >
            {badge}
          </span>
        )}

        {/* 품절 오버레이 */}
        {isSoldOut && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>품절</span>
          </div>
        )}
      </div>

      {/* 상품 정보 */}
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{product.name}</div>
        <div
          style={{
            fontSize: 16, fontWeight: 800,
            color: isSoldOut ? 'var(--text-secondary)' : 'var(--primary)',
          }}
        >
          {isSoldOut ? '품절' : formatPrice(product.price)}
        </div>
        <div
          style={{
            fontSize: 11, fontWeight: 600, marginTop: 2,
            color: isSoldOut
              ? 'var(--text-secondary)'
              : isLowStock
              ? 'var(--error)'
              : 'var(--accent)',
          }}
        >
          {isSoldOut
            ? '다음 수확을 기다려요 🍂'
            : isLowStock
            ? `⚡ 재고 ${product.stock}개`
            : `✔ 재고 ${product.stock}개`}
        </div>
      </div>
    </Link>
  )
}
