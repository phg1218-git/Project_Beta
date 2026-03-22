import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/AddToCartButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      isActive: true,
      imageUrl: true,
      createdAt: true,
    },
  })
  return product
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: '상품 없음' }

  return {
    title: product.name,
    description: product.description?.slice(0, 160) || `${product.name} — 오늘의귤`,
    openGraph: {
      title: `${product.name} | 오늘의귤`,
      description: product.description?.slice(0, 160) || '',
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product || !product.isActive) {
    notFound()
  }

  const isSoldOut = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="pb-24 bg-gray-50">
      <div className="bg-white md:max-w-5xl md:mx-auto md:shadow-sm">
        <div className="md:flex md:items-start">
          {/* 이미지 영역 */}
          <div className="relative w-full h-72 md:w-1/2 md:h-[420px] bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center overflow-hidden shrink-0">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <span className="text-8xl select-none" aria-hidden>🍊</span>
            )}

            {isSoldOut && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">품절</span>
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="p-4 md:p-6 md:w-1/2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            <p className="text-sm text-gray-500 mb-4">
              {new Date(product.createdAt).toLocaleDateString('ko-KR')} 입고
            </p>

            {/* 가격 및 재고 */}
            <div className="mb-6">
              <p className={`text-3xl font-extrabold mb-2 ${isSoldOut ? 'text-gray-400' : 'text-orange-500'}`}>
                {isSoldOut ? '품절' : formatPrice(product.price)}
              </p>
              <p className={`text-sm font-semibold ${
                isSoldOut ? 'text-gray-400' : isLowStock ? 'text-red-500' : 'text-green-600'
              }`}>
                {isSoldOut
                  ? '다음 수확을 기다려요'
                  : isLowStock
                  ? `재고 ${product.stock}개 남음`
                  : `재고 ${product.stock}개 충분함`}
              </p>
            </div>

            {/* 상품 설명 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-sm font-bold text-gray-900 mb-2">상품 설명</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* 장바구니 버튼 — 클라이언트 인터랙션만 분리 */}
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              maxStock={product.stock}
              isSoldOut={isSoldOut}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
