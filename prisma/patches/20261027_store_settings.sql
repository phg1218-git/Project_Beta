-- 기존 db:push 기반 설치에 적용하는 추가 전용 패치. 기존 주문의 배송비는 0원 유지.
BEGIN;
CREATE TABLE IF NOT EXISTS "StoreSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "data" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingFee" INTEGER NOT NULL DEFAULT 0;
COMMIT;
