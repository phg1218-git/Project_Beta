import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CheckoutForm } from '@/components/CheckoutForm'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage({ searchParams }: {
  searchParams: Promise<{ productId?: string; quantity?: string }>
}) {
  const { productId, quantity: rawQuantity } = await searchParams
  if (!productId) notFound()
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || !product.isActive) notFound()
  const quantity = Number(rawQuantity ?? 1)
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) notFound()
  return <CheckoutForm key={`${product.id}:${quantity}`} directItem={{
    id: product.id, productId: product.id, productName: product.name,
    price: product.price, quantity, stock: product.stock, isActive: product.isActive,
    imageUrl: product.imageUrl,
  }} />
}
