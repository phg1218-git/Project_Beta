# DB 스키마·마이그레이션·테스트 DB

## 현재 상태 (2026-10-28 확인)

- `prisma/schema.prisma`는 운영 DB(.env.local)와 **차이 없음**을 읽기 전용 `prisma migrate diff`로 확인함.
  - 이전에는 schema에 `Order.shippingFee`, `StoreSettings`가 없어 `db push` 시 **운영 컬럼/테이블이 삭제될 수 있었음** (Codex 브랜치가 SQL 패치로 DB에 추가한 객체).
- `prisma/migrations/0_init/migration.sql`: 현재 schema 전체를 만드는 baseline. 운영 DB에는 아직 "적용됨" 표시를 하지 않았음.

## 운영 DB baseline 등록 (배포 직전, 1회)

운영 DB는 이미 모든 테이블이 있으므로 SQL을 실행하지 않고 이력만 등록한다.
Prisma CLI는 `.env.local`을 읽지 않으므로 해당 셸에서 `$env:DATABASE_URL`을 운영 주소로 지정한 뒤 실행한다(주소를 출력·기록하지 말 것).

```powershell
# 1) 차이가 없는지 다시 확인 (읽기 전용, 출력이 "empty migration"이어야 함)
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
# 2) baseline을 적용된 것으로 표시 (_prisma_migrations 테이블 생성 + 1행 기록)
npx prisma migrate resolve --applied 0_init
```

이후 스키마 변경은 `npx prisma migrate dev --name <이름>`(테스트 DB에서) → 운영은 `npx prisma migrate deploy`.
**운영 DB에 `db push`, `migrate reset`, `migrate dev`를 실행하지 않는다.**
`scripts/init-content.cjs`(SiteContent 임시 생성)는 baseline에 포함되었으므로 새 환경에서는 필요 없다.

## 분리된 테스트 DB와 동시성 테스트

1. 2026-10-28 현재 Neon `Project_Beta`의 `production` 브랜치에 **별도 빈 데이터베이스** `project_beta_integration`을 만들었다. 운영 데이터베이스와 DB 이름이 다르며 운영 회원·주문 행을 복제하지 않았다. 같은 Neon 브랜치의 컴퓨트를 공유하므로 명령 실행 전 대상 DB 이름을 확인한다.
2. 연결 문자열은 Git에서 제외되는 `.env.test.local`의 `TEST_DATABASE_URL`에만 저장했다. 이 파일을 커밋하거나 주소를 로그·문서·채팅에 붙여 넣지 않는다.

```powershell
$testDbLine = Get-Content -LiteralPath '.env.test.local'
$env:TEST_DATABASE_URL = $testDbLine.Substring('TEST_DATABASE_URL='.Length)
node scripts/test-integration.mjs --push-schema   # 새 빈 DB의 최초 1회만
npm run test:integration
```

`scripts/test-integration.mjs`는 `TEST_DATABASE_URL`의 호스트/DB가 `.env.local`의 `DATABASE_URL`과 같으면 실행을 거부한다.
테스트는 `integration_<uuid>` 식별자로 만든 데이터만 쓰고 끝나면 지운다.
`npm run test:integration -- --push-schema`는 이 환경에서 `--push-schema`가 Node 실행기에 전달되지 않아 빈 DB에서 실패했다. 최초 스키마 적용은 위의 직접 호출을 사용한다.
2026-10-28 직접 호출 결과: 스키마 적용 후 PostgreSQL 동시성 통합 테스트 10개 하위 케이스 모두 통과(전체 TAP 11개 통과). 주문 재시도·재고·입금/취소 경쟁, 관리자 취소/환불 중복 기록, 권한 회수, 설정 충돌을 포함한다.

검증 항목 (`tests/integration/postgres.test.mjs`):
- 같은 Idempotency-Key 동시 4회 → 주문 1건, 재고 차감 1회
- 동시 사용자 취소 → 재고 복구 1회
- 입금요청 ↔ 취소 경쟁, 기한경과 취소 ↔ 관리자 직접 입금확인 경쟁 → 한 상태만 반영, 결제기록·재고 일관
- 기한경과 취소가 입금확인 요청/기한 전 주문을 건드리지 않음
- 동시 주문 → 재고 초과 판매 없음
- DB에서 관리자 권한 회수 즉시 입금확인 거부
- 설정 버전 충돌
