# 거래처 주문·출고 v0.1 데이터·API 설계

## 1. 설계 원칙

- 고객사별 DB를 분리하며 행 단위 `tenantId`는 추가하지 않는다.
- 주문 당시의 거래처명, 배송지, 품목명, 규격, 단가를 snapshot으로 보존한다.
- 금액은 JavaScript `number`가 아니라 Prisma `Decimal`과 DB `numeric`으로 계산한다.
- 금액 통화는 v0.1에서 KRW 단일 통화이며 할인·세금·결제는 계산하지 않는다.
- 상태 전환은 명시적 action API와 DB 트랜잭션으로 처리한다.
- 별도 repository, event bus, queue, workflow 계층은 만들지 않는다.

## 2. DB 모델

### `Customer`

| 필드 | 형식 | 규칙 |
|---|---|---|
| `id` | String | cuid PK |
| `code` | String | 고객사 내 unique, 필수 |
| `name` | String | 필수 |
| `businessNumber` | String? | 선택, 표시용 |
| `contactName` | String? | 선택 |
| `phone` | String? | 선택 |
| `email` | String? | 선택 |
| `defaultAddress` | String? | 기본 배송지 |
| `memo` | String? | 내부 메모 |
| `isActive` | Boolean | 기본 `true` |
| `createdAt`, `updatedAt` | DateTime | 자동 기록 |

인덱스: `code` unique, `(isActive, name)`.

### `Product`

| 필드 | 형식 | 규칙 |
|---|---|---|
| `id` | String | cuid PK |
| `code` | String | 고객사 내 unique, 필수 |
| `name` | String | 필수 |
| `specification` | String? | 규격 |
| `unit` | String | `EA`, `BOX`, `KG` 등 표시값 |
| `defaultUnitPrice` | Decimal? | `numeric(14,2)`, 선택 |
| `memo` | String? | 내부 메모 |
| `isActive` | Boolean | 기본 `true` |
| `createdAt`, `updatedAt` | DateTime | 자동 기록 |

단위 환산과 재고 필드는 추가하지 않는다. 인덱스는 `code` unique, `(isActive, name)`을 사용한다.

### `CustomerOrder`

| 필드 | 형식 | 규칙 |
|---|---|---|
| `id` | String | cuid PK |
| `orderNo` | String | `ORD-YYYYMMDD-NNNN`, unique |
| `customerId` | String | `Customer` FK, delete restrict |
| `customerNameSnapshot` | String | 주문 당시 거래처명 |
| `shippingAddress` | String | 주문 당시 배송지 snapshot |
| `status` | OrderStatus | 기본 `RECEIVED` |
| `orderedAt` | DateTime | 주문 접수 기준일 |
| `requestedShipDate` | DateTime? | 요청 출고일 |
| `totalAmount` | Decimal | `numeric(16,2)` |
| `memo` | String? | 주문 메모 |
| `createdById` | String? | User FK, delete set null |
| `firstConfirmedAt` | DateTime? | 최초 확인 시각, 설정 후 변경하지 않음 |
| `confirmedById` | String? | User FK, delete set null |
| `confirmedAt` | DateTime? | 현재 확인의 확인 시각, 확인 취소 시 null |
| `cancelledById` | String? | User FK, delete set null |
| `cancelledAt` | DateTime? | 취소 시각 |
| `cancelReason` | String? | 취소 사유 |
| `createdAt`, `updatedAt` | DateTime | 자동 기록 |

인덱스: `orderNo` unique, `(status, orderedAt)`, `(customerId, orderedAt)`.

오입력 주문 삭제는 `status = RECEIVED`이면서 `firstConfirmedAt IS NULL`일 때만 허용한다. 확인 취소로 상태가 다시 `RECEIVED`가 되어도 최초 확인 이력이 있는 주문은 삭제할 수 없다.

### `OrderItem`

| 필드 | 형식 | 규칙 |
|---|---|---|
| `id` | String | cuid PK |
| `orderId` | String | CustomerOrder FK |
| `lineNo` | Int | 주문 내 표시 순서 |
| `productId` | String | Product FK, delete restrict (사용 이력 삭제 금지 정책) |
| `productCodeSnapshot` | String | 주문 당시 품목 코드 |
| `productNameSnapshot` | String | 주문 당시 품목명 |
| `specificationSnapshot` | String? | 주문 당시 규격 |
| `unitSnapshot` | String | 주문 당시 단위 |
| `quantity` | Decimal | `numeric(14,3)`, 0보다 큼 |
| `unitPrice` | Decimal | `numeric(14,2)`, 0 이상 |
| `lineAmount` | Decimal | `quantity × unitPrice`, `numeric(16,2)` |

제약: `(orderId, lineNo)` unique. 주문 오입력 삭제 시 품목은 cascade한다.

### `Shipment`

| 필드 | 형식 | 규칙 |
|---|---|---|
| `id` | String | cuid PK |
| `orderId` | String | CustomerOrder FK, unique |
| `shippedAt` | DateTime | 필수 |
| `carrier` | String? | 수동 입력 |
| `trackingNumber` | String? | 수동 입력 |
| `memo` | String? | 출고 메모 |
| `shippedById` | String? | User FK, delete set null |
| `createdAt` | DateTime | 자동 기록 |

`orderId` unique 제약으로 주문당 출고 1건만 허용한다.

### `OrderNumberCounter`

| 필드 | 형식 | 규칙 |
|---|---|---|
| `date` | Date | PK |
| `lastValue` | Int | 날짜별 마지막 순번 |

주문 생성 트랜잭션에서 Asia/Seoul 업무일 기준의 해당 날짜 행을 잠그고 증가시켜 중복 없는 주문번호를 생성한다. 삭제된 주문번호는 재사용하지 않는다.

### 구현 보완

- `CustomerOrder.customerCodeSnapshot`도 보존한다.
- `CustomerOrder.version`은 1부터 시작하며 수정·상태 처리마다 증가한다. 모든 변경 API는 현재 `version`을 요구하고 오래된 요청은 409로 거부한다.
- `Customer.hasOrderHistory`, `Product.hasOrderHistory`는 주문에 사용되면 true가 되며 일반 API로 되돌릴 수 없다. 오입력 주문 삭제 후에도 기준정보 사용 이력을 유지한다.
- 금액은 품목별 소수 2자리 HALF_UP 반올림 후 합산하며 수량은 소수 3자리까지다.
- 단일 주문은 최대 50개 품목, 동일 품목 중복 행은 거부한다.
- 화면 선택 목록은 최대 500개 기준정보로 제한한다. 대규모 고객 도입 시 검색형 선택 UI로 확장한다.

### Enum과 감사 로그

`OrderStatus`:

- `RECEIVED`
- `CONFIRMED`
- `SHIPPED`
- `CANCELLED`

Core `AuditLog`를 재사용하며 업무 action을 추가한다.

- `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DEACTIVATED`, `CUSTOMER_DELETED`
- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DEACTIVATED`, `PRODUCT_DELETED`
- `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_CONFIRMED`, `ORDER_CONFIRMATION_REVERTED`
- `ORDER_CANCELLED`, `ORDER_DELETED`, `ORDER_SHIPPED`, `ORDER_EXPORTED`
- `DEMO_RESET`

감사 metadata에는 변경 필드, 사유, 주문번호처럼 추적에 필요한 최소 정보만 넣고 비밀번호·세션·DB URL은 기록하지 않는다.

## 3. API

모든 Route Handler는 입력 검증 후 업무 서비스로 전달한다. 업무 서비스는 다시 권한과 현재 상태를 검증한다.

### 거래처

| Method | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/customers` | USER/ADMIN | 검색·활성 필터 목록 |
| POST | `/api/customers` | ADMIN | 등록 |
| GET | `/api/customers/[id]` | USER/ADMIN | 상세 |
| PATCH | `/api/customers/[id]` | ADMIN | 수정·활성 상태 변경 |
| DELETE | `/api/customers/[id]` | ADMIN | 사용 이력 없을 때만 삭제 |

### 품목

| Method | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/products` | USER/ADMIN | 검색·활성 필터 목록 |
| POST | `/api/products` | ADMIN | 등록 |
| GET | `/api/products/[id]` | USER/ADMIN | 상세 |
| PATCH | `/api/products/[id]` | ADMIN | 수정·활성 상태 변경 |
| DELETE | `/api/products/[id]` | ADMIN | 사용 이력 없을 때만 삭제 |

### 주문·출고

| Method | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/orders` | USER/ADMIN | 기간·상태·거래처·주문번호 검색 |
| POST | `/api/orders` | USER/ADMIN | 주문 접수 |
| GET | `/api/orders/[id]` | USER/ADMIN | 주문·품목·출고·이력 상세 |
| PATCH | `/api/orders/[id]` | USER/ADMIN | `RECEIVED` 주문 수정 |
| DELETE | `/api/orders/[id]` | ADMIN | 확인 이력 없는 `RECEIVED` 오입력 주문 삭제, 사유 필수 |
| POST | `/api/orders/[id]/confirm` | USER/ADMIN | `RECEIVED → CONFIRMED` |
| POST | `/api/orders/[id]/revert-confirmation` | ADMIN | `CONFIRMED → RECEIVED`, 사유 필수 |
| POST | `/api/orders/[id]/cancel` | 상태별 | 취소, 사유 필수 |
| POST | `/api/orders/[id]/ship` | USER/ADMIN | `CONFIRMED → SHIPPED`, Shipment 생성 |
| GET | `/api/orders/export` | USER/ADMIN | 현재 필터의 `.xlsx` 생성 |

취소 API는 USER에게 `RECEIVED`만, ADMIN에게 `RECEIVED`와 `CONFIRMED`를 허용한다.

## 4. Excel

- 검색 화면의 기간·상태·거래처·주문번호 필터를 그대로 적용한다.
- 품목 한 개를 한 행으로 펼친 단일 sheet를 기본으로 한다.
- 열: 주문번호, 상태, 주문일, 거래처 코드·명, 품목 코드·명·규격·단위, 수량, 단가, 금액, 요청 출고일, 실제 출고일, 운송사, 송장번호, 접수자, 확인자, 출고자.
- 금액과 날짜는 Excel 숫자·날짜 형식으로 기록한다.
- 사용자 입력 문자열이 `=`, `+`, `-`, `@`로 시작하면 수식으로 실행되지 않도록 처리한다.
- 한 요청의 최대 행 수를 제한하고 초과 시 기간 또는 필터 축소를 안내한다.
- 다운로드 실행은 `ORDER_EXPORTED` 감사 로그로 남기되 파일 내용은 로그에 저장하지 않는다.

## 5. Core와 업무 모듈 경계

### Core에서 그대로 재사용

- Auth.js Credentials, 세션, `ADMIN/USER`, 활성 계정 검증
- 사용자 관리와 최초 관리자 생성
- 관리자 Shell과 반응형 탐색
- DataTable, Form Dialog, Confirm Dialog, 로딩·오류·빈 상태
- Prisma 연결, HTTP 오류 변환, 감사 로그 writer
- 고객별 환경변수·Compose·마이그레이션·Playwright 기반

### 신규 업무 모듈

```text
src/modules/order-shipping/
  customer-policy.ts
  order-policy.ts
  order-state.ts
  customer-validation.ts
  product-validation.ts
  order-validation.ts
  customer-service.ts
  product-service.ts
  order-service.ts
  export-service.ts
  components/
```

`src/app`의 페이지와 Route Handler는 얇은 진입점으로 유지한다. 업무 규칙, 상태 전환, 금액 계산은 모듈 내부에 둔다. 외부 연동이 없는 v0.1에서는 interface/repository 계층을 추가하지 않는다.

기존 `Task`는 Starter Kit의 예제 모듈이며 주문·출고 도메인에 포함하거나 확장하지 않는다. 업무 제품 릴리스 전 예제 메뉴와 경로의 유지·제거 여부를 별도 데이터 확인 후 결정한다.
