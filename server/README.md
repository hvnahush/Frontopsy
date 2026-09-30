# Frontopsy server

Express + TypeScript API that handles sign-up, login, Google sign-in, sessions and site checkups. Data lives in Supabase Postgres.

## Setup

1. Copy `.env.example` to `.env` and fill it in:
   - `DATABASE_URL`: in Supabase, open **Connect** (or **Project Settings → Database**) and copy the **Session pooler** connection string, then put in your database password.
   - `JWT_SECRET`: generate one with `openssl rand -hex 32`.
   - `GOOGLE_CLIENT_ID`: the same value as the frontend's `VITE_GOOGLE_CLIENT_ID`.
   - `GEMINI_API_KEY`: a Google Gemini API key, used to diagnose pasted code and uploaded screenshots. Without it, link checkups still work but those two are turned off.
   - `GEMINI_MODELS` (optional): comma-separated Gemini models to try in order. When one is overloaded or unavailable the next is used. Defaults to `gemini-3.8-flash,gemini-flash-latest,gemini-3-flash-preview,gemini-3.1-flash-lite`.
   - `CHECKUP_ALLOW_PRIVATE_URLS` (optional): whether checkups may load `localhost` and private-network addresses. Defaults to `true` in development so you can check your own dev server, and `false` in production. Never turn it on for a public deployment.
2. Create the tables: `npm run db:migrate`. You can run it again safely.
3. Install the browser checkups use: `npx playwright install chromium` (on a fresh Linux server, `npx playwright install --with-deps chromium`).
4. Start the API: `npm run dev`. It listens on http://localhost:4000.

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
| POST   | `/api/checkups`    | `{ url }`, `{ code, symptoms? }` or `{ screenshot, symptoms? }` (logged in) |
| GET    | `/api/checkups`    | none (your recent checkups) |
| GET    | `/api/checkups/:id` | none (public, for sharing) |
| GET    | `/api/checkups/:id/screenshots/:device` | none (`phone` or `laptop`) |
| DELETE | `/api/checkups/:id` | none (owner only)          |

Sessions are a signed JWT stored in an httpOnly `frontopsy_session` cookie that lasts 7 days.

## How a checkup works

`POST /api/checkups` saves a `queued` row and hands it to an in-process queue that runs one checkup at a time (`src/checkups/queue.ts`). Each job launches a fresh Chromium and then:

1. Runs Lighthouse's mobile performance audit for the speed score, the vital signs, page weight and speed issues (render-blocking files, oversized images, unused JavaScript, slow fonts, server latency).
2. Loads the page with Playwright on a phone (Pixel 7) and a laptop (1440×900), takes screenshots and runs layout checks in the page (`src/checkups/inspectPage.ts`): sideways scroll, text covered by other elements, tiny text, small tap targets, missing viewport tag, stretched or broken images, failed requests and console errors.
3. Turns the findings into plain-English issues with fix code, and estimates each fix's gain (`src/checkups/diagnose.ts`).

The frontend polls `GET /api/checkups/:id` until the status is `done` or `failed`. Jobs live in memory, so checkups still running when the server stops are marked failed on the next start.

### Pasted code

`POST /api/checkups` with `{ code }` runs a code checkup instead (`src/checkups/codeCheckup.ts`). If the code is plain HTML, it's rendered on a phone and a laptop with all network access blocked, screenshotted and run through the same layout checks. Gemini then gets the code (with line numbers), those measurements and the symptoms the user ticked, and returns issues with fixes plus the whole file with the fixes applied. Components (JSX, Vue, Svelte) and CSS/JS-only pastes can't be rendered on their own, so Gemini reviews those by reading them. Speed and looks scores for code checkups are estimated from the problems found, since there's no real page load to time.

### Uploaded screenshots

`POST /api/checkups` with `{ screenshot }` (a PNG, JPG or WebP data URL, up to 10 MB) runs a screenshot checkup (`src/checkups/screenshotCheckup.ts`). Gemini looks at the image and returns the visible problems, each with a fix and the spot in the image it's about, which becomes a pin. The upload is stored as the report's phone or laptop screenshot depending on its shape. Screenshot reports have no speed score, since speed can't be judged from a picture, and they can't be re-run: after fixing, upload a new screenshot.
