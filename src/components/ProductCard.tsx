import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  imageUrl?: string | null
}

const PRODUCT_EMOJIS = ['🍊', '🟠', '🍋', '🎁', '🍊', '🟠']

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const isSoldOut = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 5
  const emoji = PRODUCT_EMOJIS[index % PRODUCT_EMOJIS.length]

  return (
    <Link
      href={`/products/${product.id}`}
      className={`block bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
        isSoldOut ? 'opacity-80' : ''
      }`}
    >
      {/* 상품 이미지 */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl sm:text-5xl md:text-6xl">{emoji}</span>
        )}

        {/* 품절 오버레이 */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm">품절</span>
          </div>
        )}
      </div>

      {/* 상품 정보 */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 truncate">{product.name}</h3>
        <p
          className={`text-base font-extrabold mt-1 ${
            isSoldOut ? 'text-gray-400' : 'text-orange-500'
          }`}
        >
          {isSoldOut ? '품절' : formatPrice(product.price)}
        </p>
        {!isSoldOut && (
          <p className="text-[10px] text-gray-400 mt-0.5">택배비 포함</p>
        )}
        <p
          className={`text-xs font-semibold mt-1 ${
            isSoldOut
              ? 'text-gray-400'
              : isLowStock
              ? 'text-red-500'
              : 'text-green-600'
          }`}
        >
          {isSoldOut
            ? '다음 수확을 기다려요 🍂'
            : isLowStock
            ? `⚡ 재고 ${product.stock}개`
            : `✔ 재고 ${product.stock}개`}
        </p>
      </div>
    </Link>
  )
}
