# Work Management Starter Kit

## 공개 포트폴리오 체험

전용 데모 DB를 사용하는 환경에서만 `DEMO_MODE=true`를 설정합니다. 기본값은
`false`이며 고객사 운영 환경에서는 활성화하지 않습니다. `/login`의
**가입 없이 데모 체험하기**는 비밀번호 없는 전용 USER 세션을 만들고,
**체험 계정 만들기**는 `/register`에서 이메일·비밀번호로 USER 계정을 생성합니다.
ADMIN 권한은 공개 가입으로 발급하지 않습니다. 가입 기록은 감사 로그에 저장됩니다.

데모와 가입자는 Task를 공유하며 기존 USER 권한(조회·등록·수정)을 갖습니다.
사용자 관리와 Task 삭제는 ADMIN 전용입니다. 실제 고객 데이터는 넣지 마세요.
이메일 소유권 확인, 비밀번호 복구, 자동 데이터 초기화는 아직 제공하지 않습니다.
공개 가입은 전체 환경에서 15분당 10회, 총 사용자 1,000명으로 제한합니다.
인터넷 공개 전에는 추가 요청 제한과 데이터 정리 정책을 적용해야 합니다.

로컬 실행 전 `pnpm auth:secret`으로 Git에서 제외된 `.env.local`에 인증 키를
생성하고 `pnpm dev`로 실행합니다. 설치와 실행은 WSL 환경으로 통일합니다.
데모 모드 변경 후 개발 서버를 다시 시작하며, 프로덕션은 다시 빌드·배포합니다.
비활성화하면 서버의 가입·데모 인증과 데모 세션 접근도 거부됩니다.
첫 관리자는 기존 USER 존재 여부와 관계없이 `pnpm admin:create`로 생성할 수 있으며,
ADMIN이 이미 있으면 실행이 거부됩니다. 비밀번호는 터미널에서 숨김 입력합니다.

Next.js, TypeScript, Auth.js, Prisma, PostgreSQL 기반의 고객사별 독립 배포용 Starter Kit입니다.

## 구성과 권한

- 앱: `127.0.0.1:3002`
- 전용 PostgreSQL 기본 포트: `127.0.0.1:5433`
- `ADMIN`: 대시보드, 사용자 관리, Task 조회·등록·수정·삭제
- `USER`: Task 조회·등록·수정. 사용자 관리와 Task 삭제는 차단
- 공개 회원가입은 없으며 활성 사용자를 DB에서 매 요청 다시 확인합니다.
- 비밀번호는 Argon2id로 저장하고 로그인·로그아웃·사용자·Task 변경을 감사 로그로 남깁니다.

## 신규 고객 환경 초기화 절차

아래 절차는 새 고객 전용 디렉터리와 빈 DB에서만 실행합니다. 기존 고객의 `.env`, 볼륨, 컨테이너 또는 관리자 계정을 복사하지 않습니다.

1. 저장소를 고객 전용 디렉터리에 복제하고 `main`을 사용합니다.
2. `cp .env.example .env` 후 다음 값을 고객마다 고유하게 변경합니다.
   - `COMPOSE_PROJECT_NAME`, `COMPOSE_CONTAINER_NAME`
   - `POSTGRES_VOLUME_NAME`, `POSTGRES_NETWORK_NAME`, `POSTGRES_PORT`
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
   - `AUTH_URL`, `NEXTAUTH_URL` — 실제 앱 origin과 정확히 일치해야 합니다.
3. 의존성을 설치하고 로컬 전용 Auth.js 시크릿을 생성합니다.

```bash
pnpm install --frozen-lockfile
pnpm auth:secret
```

`pnpm auth:secret`은 실제 값을 출력하지 않고 Git에서 제외된 `.env.local`에 `AUTH_SECRET`을 생성합니다. 배포 환경에서는 고객별 Secret 저장소에 별도 값을 생성하며 개발·Preview·Production 값을 공유하지 않습니다.

4. 지정한 포트와 리소스 이름이 기존 서비스와 겹치지 않는지 확인한 뒤 전용 DB를 시작하고 커밋된 마이그레이션만 적용합니다.

```bash
docker compose config --quiet
pnpm db:up
pnpm db:deploy
```

5. ADMIN이 없는 DB에서 최초 관리자 한 명을 생성합니다. 실제 자격정보는 명령 인자로 남기지 않습니다.

```bash
read -r -p "Admin name: " ADMIN_NAME
read -r -p "Admin email: " ADMIN_EMAIL
read -r -s -p "Admin password: " ADMIN_PASSWORD
echo
ADMIN_NAME="$ADMIN_NAME" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" pnpm admin:create
unset ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
```

최초 관리자 명령은 ADMIN이 이미 있으면 중단합니다. 비밀번호는 12–128자이며 대문자·소문자·숫자·특수문자를 포함해야 합니다.

6. 검증 후 앱을 시작합니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## 개발

```bash
pnpm db:up
pnpm db:deploy
pnpm dev
```

- Health check: <http://127.0.0.1:3002/api/health>
- Login: <http://127.0.0.1:3002/login>
- Dashboard: <http://127.0.0.1:3002/admin>
- Prisma Studio: `pnpm db:studio` (`5555`)

## 테스트

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e:browser
```

Playwright는 production build와 Chromium을 사용합니다. 최초 한 번 `pnpm exec playwright install --with-deps chromium`이 필요하며 Linux 시스템 패키지 설치에는 관리자 권한이 필요할 수 있습니다. 브라우저 E2E는 `.invalid` 테스트 계정과 `[E2E]` Task만 만들고 전후에 관련 감사 로그와 함께 정리합니다.

`pnpm test:e2e:auth`는 최초 관리자 생성 절차 자체를 검사하므로 **Starter Kit 전용 User 테이블이 비어 있을 때만** 실행합니다. 실제 관리자나 고객 데이터가 있는 DB에서는 실행하지 않습니다.

## 시크릿 및 고객 분리 체크리스트

- `.env`, `.env.local`, `.env.*.local`은 Git에서 제외하며 `.env.example`만 커밋합니다.
- `AUTH_SECRET`, DB 비밀번호, 실제 관리자 비밀번호는 고객·환경 간 공유하지 않습니다.
- `NEXT_PUBLIC_` 변수에는 시크릿을 넣지 않습니다.
- 고객마다 Compose 프로젝트·컨테이너·볼륨·네트워크 이름과 호스트 포트를 분리합니다.
- 스키마 변경은 `prisma/migrations`에 커밋하고 배포에서는 `pnpm db:deploy`만 사용합니다.
- 백업과 복구 절차를 검증하기 전에는 운영 마이그레이션을 적용하지 않습니다.
