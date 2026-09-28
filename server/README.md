# Frontopsy server

Express + TypeScript API that handles sign-up, login, Google sign-in and sessions. User accounts live in Supabase Postgres.

## Setup

1. Copy `.env.example` to `.env` and fill it in:
   - `DATABASE_URL`: in Supabase, open **Connect** (or **Project Settings → Database**) and copy the **Session pooler** connection string, then put in your database password.
   - `JWT_SECRET`: generate one with `openssl rand -hex 32`.
   - `GOOGLE_CLIENT_ID`: the same value as the frontend's `VITE_GOOGLE_CLIENT_ID`.
2. Create the `users` table: `npm run db:migrate`. You can run it again safely.
3. Start the API: `npm run dev`. It listens on http://localhost:4000.

Run the frontend with `npm run dev` in `../frontopsy`. Vite forwards `/api` requests to this server.

## Endpoints

| Method | Path               | Body                        |
| ------ | ------------------ | --------------------------- |
| POST   | `/api/auth/signup` | `{ name, email, password }` |
| POST   | `/api/auth/login`  | `{ email, password }`       |
| POST   | `/api/auth/google` | `{ accessToken }`           |
| POST   | `/api/auth/logout` | none                        |
| GET    | `/api/auth/me`     | none (returns `{ user: null }` when logged out) |
| GET    | `/api/health`      | none                        |

Sessions are a signed JWT stored in an httpOnly `frontopsy_session` cookie that lasts 7 days.
