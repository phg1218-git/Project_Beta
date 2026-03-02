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
    // DB 미연결 시 목업 데이터 반환
    return MOCK_PRODUCTS
  }
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="page-enter">
      {/* 페이지 헤더 */}
      <div
        style={{
          padding: '20px 16px 12px',
          background: 'white',
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🍊 전체 상품</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          오늘 수확한 신선한 귤을 만나보세요
        </p>
      </div>

      {/* 필터 탭 */}
      <FilterTabs />

      {/* 상품 그리드 */}
      <section style={{ padding: '16px' }}>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍊</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              잠시 후 다시 확인해 주세요. 곧 귤이 도착해요!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterTabs() {
  const tabs = ['전체', '노지귤', '천혜향', '레드향', '한라봉', '선물세트']
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        background: 'white',
        borderBottom: '1px solid var(--neutral-200)',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab, i) => (
        <button
          key={tab}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: 20,
            border: `1.5px solid ${i === 0 ? 'var(--primary)' : 'var(--neutral-200)'}`,
            background: i === 0 ? 'var(--primary)' : 'transparent',
            color: i === 0 ? 'white' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── 목업 데이터 (DB 미연결 시 사용) ──
const MOCK_PRODUCTS = [
  {
    id: 'mock-1',
    name: '제주 황금 노지귤',
    description: '제주 한림읍 황금 노지에서 수확한 싱싱한 귤',
    price: 18900,
    stock: 47,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    _badge: 'BEST',
    _emoji: '🍊',
  },
  {
    id: 'mock-2',
    name: '천혜향 프리미엄',
    description: '서귀포 남원읍 농장 직송 천혜향',
    price: 32000,
    stock: 12,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    _badge: 'NEW',
    _emoji: '🟠',
  },
  {
    id: 'mock-3',
    name: '레드향 10kg',
    description: '제주 애월읍 레드향, 달콤하고 즙이 풍부',
    price: 45000,
    stock: 3,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    _badge: null,
    _emoji: '🍋',
  },
  {
    id: 'mock-4',
    name: '노지귤 소과 3kg',
    description: '작지만 달콤한 소과 노지귤',
    price: 12000,
    stock: 88,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    _badge: null,
    _emoji: '🍊',
  },
  {
    id: 'mock-5',
    name: '설 선물세트 A',
    description: '천혜향 + 한라봉 혼합 선물세트',
    price: 58000,
    stock: 23,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    _badge: null,
    _emoji: '🎁',
  },
  {
    id: 'mock-6',
    name: '한라봉 선물세트',
    description: '서귀포 효돈동 한라봉 선물세트',
    price: 65000,
    stock: 0,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    _badge: null,
    _emoji: '🍊',
  },
]
