# Job Portal

Build-phase setup is deployment-agnostic.
No Docker/Kubernetes is required in this phase.

## Stack
- Backend: Node.js + Express + TypeScript
- Frontend: Next.js + TypeScript
- Database: PostgreSQL (default)

## Required Scripts
- `npm run dev` (backend + frontend)
- `npm run test`
- `npm run lint`
- `npm run migrate`

## Local Setup
1. Install dependencies:
```bash
npm run install-all
```
2. Create env files:
```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```
PowerShell equivalent:
```powershell
Copy-Item .env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```
3. Ensure DB variables are set in `backend/.env`:
- `DATABASE_URL=postgresql://postgres:postgres_password@localhost:5432/job_portal`
- or `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`
4. Run migrations:
```bash
npm run migrate
```
5. Start app:
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:5000`.
Health check: `http://localhost:5000/health`.

## Managed Dev Postgres Option
If you do not want local Postgres, use a managed dev DB (for example Neon/Supabase) and set only:
```bash
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DB_SSL=true
```

## Notes
- Application is stateless at backend runtime.
- Server-side sessions/local file persistence are not used as a deployment requirement in this phase.
- Docker/Kubernetes, CI/CD, infra provisioning, and observability are intentionally deferred to deployment phase.
