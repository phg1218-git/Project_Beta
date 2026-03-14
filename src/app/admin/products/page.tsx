import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { AdminProductActions } from '@/components/AdminProductActions'
import Link from 'next/link'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ q?: string; isActive?: string; lowStock?: string; page?: string }>
}

async function getProducts(q: string, isActive: string, lowStock: boolean, page: number) {
  try {
    const where: Prisma.ProductWhereInput = {}

    if (q) {
      where.name = { contains: q, mode: 'insensitive' }
    }
    if (isActive === 'true') where.isActive = true
    else if (isActive === 'false') where.isActive = false

    if (lowStock) where.stock = { lte: 10 }

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

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const isActive = params.isActive ?? ''
  const lowStock = params.lowStock === 'true'
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { products, total } = await getProducts(q, isActive, lowStock, page)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (isActive) sp.set('isActive', isActive)
    if (lowStock) sp.set('lowStock', 'true')
    sp.set('page', String(p))
    return `/admin/products?${sp.toString()}`
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🍊 상품 관리</h1>
          <p className="text-gray-500 mt-1">상품을 등록하고 관리하세요</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
        >
          + 상품 등록
        </Link>
      </div>

      {/* 검색 + 필터 */}
      <form method="GET" action="/admin/products" className="mb-6 flex flex-wrap gap-2 items-center">
        <input type="hidden" name="page" value="1" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="상품명 검색"
          className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <select
          name="isActive"
          defaultValue={isActive}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="">노출 전체</option>
          <option value="true">노출</option>
          <option value="false">숨김</option>
        </select>
        <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            name="lowStock"
            value="true"
            defaultChecked={lowStock}
            className="rounded"
          />
          재고 부족(≤10)
        </label>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          검색
        </button>
        {(q || isActive || lowStock) && (
          <Link
            href="/admin/products"
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 결과 수 */}
      <p className="text-xs text-gray-400 mb-3">총 {total.toLocaleString()}개 상품</p>

      {/* 상품 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">해당 조건의 상품이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상품</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">가격</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">재고</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">노출</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">등록일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg flex items-center justify-center text-xl">
                          🍊
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-semibold ${
                          product.stock === 0
                            ? 'text-red-500'
                            : product.stock <= 10
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {product.stock}개
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {product.isActive ? '노출' : '숨김'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminProductActions product={product} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
              이전
            </Link>
          )}
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
