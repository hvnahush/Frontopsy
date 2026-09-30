# Deploying Frontopsy

The API server runs on **Google Cloud Run** and the frontend on **Vercel**. Vercel forwards every `/api/*` request to Cloud Run (see `frontopsy/vercel.json`), so the browser only ever talks to your Vercel domain and the login cookie keeps working.

```
browser ──> your-app.vercel.app ──/api/*──> frontopsy-api-xxxx.run.app ──> Supabase Postgres
                                                     └── Chromium, Lighthouse, Gemini
```

## 1. Server on Cloud Run

### One-time setup

Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), then:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region australia-southeast1   # the region Frontopsy runs in; ideally close to your Supabase database

gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com
```

Put the secrets in Secret Manager, straight from `server/.env` (nothing is printed):

```bash
cd server
for name in DATABASE_URL JWT_SECRET GEMINI_API_KEY; do
  grep "^$name=" .env | cut -d= -f2- | tr -d '\n' | gcloud secrets create "$name" --data-file=-
done
```

If a value in `.env` is wrapped in quotes, remove the quotes first.

Let Cloud Run read them (skip this and the deploy fails with "Permission denied on secret"):

```bash
PROJECT_NUMBER=$(gcloud projects describe "$(gcloud config get project)" --format='value(projectNumber)')
for name in DATABASE_URL JWT_SECRET GEMINI_API_KEY; do
  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role=roles/secretmanager.secretAccessor
done
```

### Deploy (and redeploy after changes)

From the `server` folder:

```bash
gcloud run deploy frontopsy-api \
  --source . \
  --allow-unauthenticated \
  --memory 2Gi --cpu 1 \
  --no-cpu-throttling \
  --min-instances 0 --max-instances 1 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production,TRUST_PROXY_HOPS=2,GOOGLE_CLIENT_ID=$(grep '^GOOGLE_CLIENT_ID=' .env | cut -d= -f2-)" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

It builds the `Dockerfile` with Cloud Build (the first build takes a few minutes) and prints the service URL, e.g. `https://frontopsy-api-abc123-el.a.run.app`. Check it:

```bash
curl https://YOUR-SERVICE-URL/api/health    # {"ok":true}
```

Why these flags:

| Flag | Why |
| --- | --- |
| `--memory 2Gi --cpu 1` | Chromium plus Lighthouse need about 1–1.5 GB. Use `--cpu 2` if checkups feel slow. |
| `--no-cpu-throttling` | Checkups keep running after the "started" response is sent. Without this, Cloud Run freezes the CPU between requests and they'd stall. |
| `--max-instances 1` | Checkups queue in the server's memory, one at a time. More instances would each have their own queue, and a new instance marks the others' running checkups as failed when it starts. |
| `--min-instances 0` | Keeps it cheap: the instance sleeps when nobody's using it. The page polls every 1.5s during a checkup, which keeps the instance awake until it finishes. Set it to `1` to skip the few-second cold start (costs more, since the CPU is always on). |
| `TRUST_PROXY_HOPS=2` | Vercel plus Google's front end sit in front of the server, so rate limits need to look 2 hops back for the visitor's IP. |

`NODE_ENV=production` also turns on secure cookies and blocks checkups of `localhost` and private-network addresses.

The database is the same Supabase project you use now and is already migrated. If you point `DATABASE_URL` at a new database, run `npm run db:migrate` locally with that `DATABASE_URL` once.

## 2. Frontend on Vercel

1. `frontopsy/vercel.json` already points `/api/*` at the live server (`https://frontopsy-api-561034761189.australia-southeast1.run.app`). If the Cloud Run URL ever changes, update it there, then commit and push.
2. In Vercel: **Add New → Project**, import the GitHub repo, and set:
   - **Root Directory:** `frontopsy`
   - **Framework Preset:** Vite (build `npm run build`, output `dist`, both detected automatically)
   - **Environment variables:** `VITE_GOOGLE_CLIENT_ID` = your Google OAuth client ID. Leave `VITE_API_URL` unset: requests go through the `/api` rewrite.
3. Deploy. Every push to `main` redeploys automatically.

## 3. Google sign-in

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), open your OAuth client and add your Vercel URL (e.g. `https://frontopsy.vercel.app`, plus any custom domain) under **Authorized JavaScript origins**.

## Updating

- **Server:** rerun the `gcloud run deploy` command from `server/`.
- **Frontend:** push to `main`.
- **A secret:** `grep '^GEMINI_API_KEY=' .env | cut -d= -f2- | tr -d '\n' | gcloud secrets versions add GEMINI_API_KEY --data-file=-`, then redeploy the server so it picks up the new version.
