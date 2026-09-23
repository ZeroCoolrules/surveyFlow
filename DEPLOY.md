# Deploying SurveyFlow to GoDaddy

## Recommended for GoDaddy *shared* hosting: Appwrite backend + GoDaddy frontend

Shared plans usually can't run a Node process, so the API runs as an **Appwrite Function** (`functions/api`)
with its data in **Appwrite Databases**, and only the static frontend lives on GoDaddy. The old Express server in
`server/` is kept for local dev and for hosts that can run Node; the function serves the same `/api/...` routes.

### 1. Create the Appwrite project and link the CLI

```bash
npm install -g appwrite-cli
appwrite login
appwrite init project          # pick/create the project; note the project ID and region
```

Then open [appwrite.config.json](appwrite.config.json) and replace `<PROJECT_ID>` and `<REGION>`
(the endpoint must be your project's regional endpoint, e.g. `https://fra.cloud.appwrite.io/v1`).

### 2. Set the admin token and deploy

```bash
cd functions/api
cp .env.example .env           # set ADMIN_SETTINGS_TOKEN to a long random string
cd ../..
appwrite push tables           # creates the database + 4 tables
appwrite push functions --function-id api --with-variables --activate
```

### 3. Get the API URL

Appwrite Console → **Functions → surveyflow-api → Domains**. It looks like `https://<id>.<region>.appwrite.run`.
Check it: `curl https://<that-domain>/health` should return `{"ok":true}`.

### 4. Build the frontend against it and upload to GoDaddy

Create `.env.production` in the project root:

```
VITE_API_BASE_URL=https://<that-domain>
```

```bash
npm run build
```

Upload the **contents** of `dist/` into `public_html` (or your addon domain's folder) via cPanel File Manager.

### 5. Finish in the app

- Open your site, go to **Settings**, enter the admin token, then paste your CPX / BitLabs keys.
- In each network's dashboard set the postback URL to
  `https://<that-domain>/api/webhooks/cpx` and `https://<that-domain>/api/webhooks/bitlabs`.

Notes: function timeout is 30s; the database has no public permissions, so only the function (via its own
key) can read or write it. Back up the `completions` table periodically. It is your earnings ledger.

---

## Alternative: run the Node server on GoDaddy itself

SurveyFlow is two separate pieces that both need to go live:

1. **Frontend** — static files (`npm run build` output) → served from `public_html`
2. **Backend API** (`server/`) — a long-running Node process → needs GoDaddy's **Node.js hosting** feature

## 0. Confirm your GoDaddy plan supports Node.js

Static file hosting (any GoDaddy shared plan) is not enough — the backend needs an actual running Node process. Check for **"Setup Node.js App"** in cPanel:

- **cPanel → Software → Setup Node.js App** exists → you're on a plan that supports it (GoDaddy's higher-tier Business/Web Hosting Plus plans, or a VPS/Dedicated server). Use Path A below.
- No such option → your plan is static-hosting only. Either upgrade the GoDaddy plan, or keep the backend elsewhere (Railway/Render/Fly.io — all have free tiers) and only host the frontend on GoDaddy. Either way the steps below still apply to whichever host runs `server/`.

---

## Path A: cPanel "Setup Node.js App" (shared/Business hosting)

### 1. Upload the code

Zip the whole project (or just push it via Git if cPanel Git Version Control is enabled) and upload it to a folder **outside** `public_html`, e.g. `~/surveyflow-app/`. Keeping the source out of `public_html` means it isn't directly downloadable by visitors.

```bash
# from your local machine
cd "C:\Users\pc\Documents\app"
git init   # if not already a repo
git add .
git commit -m "Deploy SurveyFlow"
```

Then either `git push` to a repo cPanel can pull from, or upload a zip via cPanel's File Manager and extract it into `~/surveyflow-app/`.

### 2. Create the Node app for the backend

cPanel → **Setup Node.js App** → **Create Application**:

- **Node.js version**: 22.x or newer (the backend uses Node's built-in `node:sqlite`, which needs Node ≥ 22.5 — pick the highest 22.x or 24.x GoDaddy offers)
- **Application mode**: Production
- **Application root**: `surveyflow-app/server`
- **Application URL**: pick a subdomain, e.g. `api.yourdomain.com` (create the subdomain first under **Domains → Subdomains** if it doesn't exist)
- **Application startup file**: `dist/index.js`

Click **Create**. cPanel gives you a command like:

```bash
source /home/youruser/nodevenv/surveyflow-app/server/22/bin/activate && cd /home/youruser/surveyflow-app/server
```

Use that exact path for the next steps (SSH in, or use cPanel's Terminal).

### 3. Install deps and build

Inside the activated Node environment from step 2:

```bash
npm install
npm run build      # compiles server/src -> server/dist
```

### 4. Set environment variables

In the **Setup Node.js App** editor for this app, add each variable from `server/.env.example` under **Environment Variables** (do NOT upload your real `.env` file — cPanel's env var UI is the safer place for secrets on shared hosting):

| Variable | Value |
|---|---|
| `PORT` | leave as GoDaddy assigns it (cPanel sets `PORT` itself; the app already reads `process.env.PORT`) |
| `CPX_APP_ID` / `CPX_SECURE_HASH` / `CPX_POSTBACK_SECRET` | from your CPX Research dashboard |
| `BITLABS_API_TOKEN` / `BITLABS_POSTBACK_SECRET` | from your BitLabs dashboard |
| `ANTHROPIC_API_KEY` | from console.anthropic.com (optional — AI ranking falls back to plain sort without it) |

Click **Save**, then **Restart** the app.

### 5. Verify the API is live

```bash
curl https://api.yourdomain.com/health
# {"ok":true}
```

### 6. Point the survey networks' postback URLs here

In each network's dashboard, set the server-to-server postback/webhook URL to:

- CPX Research: `https://api.yourdomain.com/api/webhooks/cpx?status={status}&trans_id={trans_id}&user_id={user_id}&amount_local={amount_local}&offer_id={offer_id}&secure_hash={secure_hash}`
- BitLabs: `https://api.yourdomain.com/api/webhooks/bitlabs?uid={uid}&val={val}&tx_id={tx_id}&survey_id={survey_id}&secret=YOUR_BITLABS_POSTBACK_SECRET`

(Exact placeholder syntax varies by network — check their docs; the important part is the URL host/path.)

### 7. Build and upload the frontend

Back on your local machine:

```bash
cd "C:\Users\pc\Documents\app"
```

Set the frontend to talk to your real API before building — create `.env.production`:

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

Then build:

```bash
npm run build
```

This produces a `dist/` folder. Upload **its contents** (not the folder itself) into `public_html` via cPanel File Manager or FTP, so `public_html/index.html` exists directly.

### 8. HTTPS

GoDaddy's AutoSSL (cPanel → Security → SSL/TLS Status) should cover both your main domain and the `api.` subdomain automatically. Confirm both show a valid certificate before going live — mixed HTTP/HTTPS will break the frontend's requests to the API.

---

## Path B: VPS / Dedicated GoDaddy server (full control)

If you have root SSH access instead of cPanel:

```bash
# On the server
sudo apt update && sudo apt install -y nodejs npm nginx
node -v   # confirm >= 22.5 for node:sqlite; install via nvm if the distro package is older

git clone <your-repo> /var/www/surveyflow
cd /var/www/surveyflow/server
npm install
npm run build
cp .env.example .env
nano .env   # fill in real values

npm install -g pm2
pm2 start dist/index.js --name surveyflow-api
pm2 save
pm2 startup   # follow the printed instructions to survive reboots

cd /var/www/surveyflow
npm install
echo "VITE_API_BASE_URL=https://api.yourdomain.com" > .env.production
npm run build
# copy dist/* to your nginx web root, e.g.:
sudo cp -r dist/* /var/www/html/
```

Nginx config for the API subdomain (`/etc/nginx/sites-available/api.yourdomain.com`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:8788;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com   # free HTTPS via Let's Encrypt
```

---

## Post-deploy checklist

- [ ] `https://api.yourdomain.com/health` returns `{"ok":true}`
- [ ] `https://yourdomain.com` loads and the sign-in bar creates a user (check Network tab: `POST /api/users` → 201)
- [ ] Opportunities section shows the "no networks configured" warning until you add real API keys, never fake data
- [ ] Postback URLs are set in each network's dashboard and point at your live `api.` domain, not `localhost`
- [ ] `server/.env` (or cPanel's env var UI) has real keys, and `server/.env` itself is **not** inside `public_html` or committed to a public git repo
- [ ] SQLite file (`server/surveyflow.sqlite3`) is on a path that survives redeploys/restarts — back it up periodically, since it's your only earnings ledger until you add a payout processor
