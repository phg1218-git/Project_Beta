import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/ProductCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen pb-20">
      <div className="px-4 py-5 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">🍊 전체 상품</h1>
        <p className="text-sm text-gray-500 mt-1">
          오늘 수확한 신선한 귤을 만나보세요
        </p>
      </div>

      <section className="p-4">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍊</div>
            <p className="text-gray-500">
              등록된 상품이 없어요.<br />곧 귤이 도착할 예정이에요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
