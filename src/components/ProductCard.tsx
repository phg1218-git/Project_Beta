import Link from 'next/link'
import Image from 'next/image'
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
    <article
      className={`block bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
        isSoldOut ? 'opacity-80' : ''
      }`}
    >
      <Link href={`/products/${product.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">
        {/* 상품 이미지 */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <span className="text-4xl">{emoji}</span>
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
      <div className="px-3 pb-3">
        {isSoldOut ? (
          <button type="button" disabled className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-500 text-sm font-bold">
            품절
          </button>
        ) : (
          <Link
            href={`/checkout?productId=${encodeURIComponent(product.id)}&quantity=1`}
            aria-label={`${product.name} 빠른구매`}
            className="block w-full py-2.5 rounded-lg bg-orange-600 text-white text-center text-sm font-bold hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            빠른구매
          </Link>
        )}
      </div>
    </article>
  )
}
