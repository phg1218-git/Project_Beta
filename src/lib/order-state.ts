import type { Prisma, OrderStatus } from '@prisma/client'

export class OrderStateConflict extends Error {
  constructor() {
    super('주문 상태가 변경되었습니다. 새로고침 후 다시 확인해주세요.')
  }
}

// 상태 확인과 변경을 한 UPDATE로 처리한다. 트랜잭션의 첫 쓰기로 호출하여
// 다른 요청이 같은 주문의 재고/결제/배송 정보를 동시에 변경하지 못하게 한다.
export async function transitionOrder(
  tx: Prisma.TransactionClient,
  id: string,
  from: OrderStatus,
  data: Prisma.OrderUpdateManyMutationInput,
  extraWhere: Prisma.OrderWhereInput = {},
) {
  const result = await tx.order.updateMany({
    where: { ...extraWhere, id, status: from },
    data,
  })
  if (result.count !== 1) throw new OrderStateConflict()
}
