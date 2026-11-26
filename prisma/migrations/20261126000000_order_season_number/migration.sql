-- 시즌 주문번호: Order.orderNumber + OrderSeason 카운터

ALTER TABLE "Order" ADD COLUMN "orderNumber" TEXT;
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

CREATE TABLE "OrderSeason" (
    "season" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,

    CONSTRAINT "OrderSeason_pkey" PRIMARY KEY ("season")
);

-- 기존 주문 번호 부여: 한국시간 기준 11~12월은 그해, 1~10월은 전년도 시즌(아직 마감된 시즌 없음).
WITH numbered AS (
    SELECT
        "id",
        CASE WHEN EXTRACT(MONTH FROM ("createdAt" + INTERVAL '9 hours')) >= 11
             THEN EXTRACT(YEAR FROM ("createdAt" + INTERVAL '9 hours'))::int
             ELSE EXTRACT(YEAR FROM ("createdAt" + INTERVAL '9 hours'))::int - 1
        END AS season,
        "createdAt"
    FROM "Order"
),
ranked AS (
    SELECT "id", season,
           ROW_NUMBER() OVER (PARTITION BY season ORDER BY "createdAt", "id") AS seq
    FROM numbered
)
UPDATE "Order" o
SET "orderNumber" = ranked.season || '-' || ranked.seq
FROM ranked
WHERE o."id" = ranked."id";

INSERT INTO "OrderSeason" ("season", "lastNumber")
SELECT split_part("orderNumber", '-', 1)::int, MAX(split_part("orderNumber", '-', 2)::int)
FROM "Order"
WHERE "orderNumber" IS NOT NULL
GROUP BY 1;
