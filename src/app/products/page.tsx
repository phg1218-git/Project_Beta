import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

async function getProducts(q: string, page: number) {
  try {
    const where = {
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ])
    return { products, total }
  } catch {
    return { products: [], total: 0 }
  }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { products, total } = await getProducts(q, page)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    sp.set('page', String(p))
    return `/products?${sp.toString()}`
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 페이지 헤더 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">🍊 전체 상품</h1>
        <p className="text-sm text-gray-500 mt-1">오늘 수확한 신선한 귤을 만나보세요</p>
      </div>

      {/* 검색 */}
      <form method="GET" action="/products" className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="상품명 또는 설명 검색"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            검색
          </button>
          {q && (
            <Link
              href="/products"
              className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
            >
              초기화
            </Link>
          )}
        </div>
      </form>

      <section className="p-4">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍊</div>
            <p className="text-gray-500">
              {q ? `"${q}"에 해당하는 상품이 없어요.` : '등록된 상품이 없어요.\n곧 귤이 도착할 예정이에요!'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">총 {total.toLocaleString()}개 상품</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={buildHref(page - 1)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    이전
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...')
                    }
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={buildHref(p as number)}
                        className={`px-3 py-2 text-sm rounded-lg ${
                          page === p
                            ? 'bg-orange-500 text-white font-semibold'
                            : 'border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}
                {page < totalPages && (
                  <Link
                    href={buildHref(page + 1)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    다음
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
