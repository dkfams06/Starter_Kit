# Work Management Starter Kit

Next.js, TypeScript, Auth.js, Prisma, PostgreSQL 기반의 업무관리 서비스 초기 환경입니다.

## Local development

```bash
pnpm db:up
pnpm db:deploy
pnpm dev
```

- App: <http://127.0.0.1:3002>
- Health check: <http://127.0.0.1:3002/api/health>
- PostgreSQL: `127.0.0.1:5433`
- Prisma Studio: `pnpm db:studio` (`5555`)
- Login: <http://127.0.0.1:3002/login>
- Admin users: <http://127.0.0.1:3002/admin/users>

The database container, network, and volume are dedicated to this project.

## First administrator

First generate a local Auth.js secret if `.env.local` does not already contain one.
The command writes it directly to the ignored file without printing the value.

```bash
pnpm auth:secret
```

With an empty `User` table, provide the first administrator credentials only to
the command process:

```bash
read -r -p "Admin name: " ADMIN_NAME
read -r -p "Admin email: " ADMIN_EMAIL
read -r -s -p "Admin password: " ADMIN_PASSWORD
echo
ADMIN_NAME="$ADMIN_NAME" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" pnpm admin:create
unset ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
```

The password must be 12–128 characters and include upper- and lowercase letters,
a number, and a symbol. The bootstrap command refuses to run after any user exists.
There is no public registration route.

## Authorization model

- Auth.js Credentials issues an encrypted, HTTP-only JWT session.
- Every protected page and API request reloads the user from PostgreSQL to enforce
  the current role and active status.
- `ADMIN` can create, read, update, deactivate, reactivate, and delete users.
- Active users must be deactivated before deletion. Self-deactivation, self-deletion,
  and removal of the final active administrator are blocked.
- Passwords use Argon2id. Login and user-management events are written to `AuditLog`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e:auth # requires an empty local User table
```
