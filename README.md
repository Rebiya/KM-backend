# KM-backend

Minimal Knowledge Management (KM) backend prototype:
- Node.js + Express
- PostgreSQL
- JWT access tokens
- RBAC (intern/mentor/admin)
- Raw SQL only (`pg`)

## Setup
1. Create a PostgreSQL database and user.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` + `JWT_SECRET`.
3. Start the server:
   - `npm install`
   - `npm run start`

If `AUTO_CREATE_TABLES=true`, tables will be created on startup.

Optional demo users:
- Set `SEED_DEMO=true`
- Then run: `npm run seed`

## Auth
Login:
- `POST /auth/login`
- Body: `{ "email": "...", "password": "..." }`
- Response: `{ "access_token": "...", "token_type": "bearer" }`

Authenticated requests must include:
- `Authorization: Bearer <access_token>`

## Endpoints
Public (approved insights only):
- `GET /insights`
- `GET /insights/:id` (returns 404 if not approved)

Authenticated:
- `POST /insights` (intern/mentor only)
- `GET /insights/me`

Admin approval:
- `POST /admin/insights/:id/approve`
- `POST /admin/insights/:id/reject`
