# Kosmos Stays — deployment checklist (Koyeb + free services)

## Recommended layout
- **Frontend:** Cloudflare Pages (free static hosting/CDN; deploy `frontend/`).
- **API:** Koyeb Node.js Web Service using `backend/` as the work directory.
- **Database:** MongoDB Atlas M0 free cluster for an MVP.
- **Password reset email:** Resend SMTP free plan (verify your sending domain first).
- **Customer ID photos:** Cloudflare R2 private bucket. This is a required production step; the current code stores ID images on local disk, which can disappear when a Koyeb instance is replaced/redeployed. Do not store real customer IDs until private persistent object storage is implemented and tested.

Free tiers can change. Koyeb's free instance is for testing/hobby projects and scales to zero after one hour without traffic; expect cold starts. Do not promise production uptime on the free instance.

## 1. Prepare secrets
Use `backend/.env.example` as a reference. Never commit `.env` files. Generate a unique long `JWT_SECRET`. Set:
- `MONGODB_URI`: Atlas connection string; create a dedicated DB user with a strong password.
- `JWT_SECRET`: random secret, at least 32 random bytes.
- `ADMIN_EMAIL`: email of the account you personally create for admin.
- `FRONTEND_URL`: exact Cloudflare Pages/custom-domain origin, e.g. `https://app.kosmosstays.in` (no trailing slash). Multiple origins can be comma-separated.
- `API_ORIGIN`: API origin only, e.g. `https://kosmos-api-yourname.koyeb.app` (no `/api` suffix).
- `APP_BASE_URL`: public frontend URL for links.
- `TELEGRAM_BOT_TOKEN` and `ADMIN_TELEGRAM_ID` only if Telegram notifications are needed.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for password reset.

## 2. Deploy API on Koyeb
1. Push this repository to a private GitHub repository.
2. Create a Koyeb Web Service from that repository; set the **work/build directory** to `backend`.
3. Build command: `npm install`; run command: `npm start`.
4. Add the environment variables above in Koyeb's Secrets/Environment settings. Set `NODE_ENV=production`, `PORT=8000` (Koyeb supplies PORT; code honors it), `FRONTEND_URL` to your real frontend origin, and `API_ORIGIN` to the API origin.
5. Expose HTTP port using the `PORT` environment variable. After deploy, verify `https://YOUR-API-DOMAIN/api/health` returns `{ "ok": true, "service": "kosmos-stays" }`.
6. Only run one API instance while Telegram polling is enabled. Multiple instances can conflict while polling the same bot.

## 3. Deploy frontend on Cloudflare Pages
1. Create a Pages project connected to your Git repository.
2. Root directory: `frontend`; build command: `npm run build`; output directory: `dist`.
3. Add `VITE_API_URL=https://YOUR-API-DOMAIN/api` as a Pages environment variable for Production (and Preview if needed).
4. Deploy, then add your domain in Pages and set `FRONTEND_URL` in Koyeb to the final exact origin.

## 4. Set up admin safely
1. Register an account using the email configured as `ADMIN_EMAIL`.
2. Run the one-time script from the backend directory using the same production database URI: `node promote-admin.js`.
3. Verify the admin panel works.
4. Remove `promote-admin.js` from the deployed repository after use. Never let public sign-up decide who is admin.

## 5. Required checks before real customer data
- [ ] Configure private, persistent object storage for customer ID photos; test authenticated access and confirm one host cannot access another host's photos.
- [ ] Configure SMTP and test forgot-password, invalid codes, and expired codes.
- [ ] Test with two hosts: each must only see their own bookings, units, subscription statuses and ID photos.
- [ ] Test that a public account cannot open the admin panel or admin API.
- [ ] Test subscription expiry, checkout, cleaning, cleaner notifications and the single 30-minute alert.
- [ ] Take and restore a database backup; define a retention/deletion policy for ID photos.
- [ ] Check all secrets are in platform environment settings, not source code or Git.
- [ ] Confirm legal/privacy obligations for collecting identity documents and tell hosts how long images are retained.

## Local development
Backend: `cd backend && npm install && npm run dev`.
Frontend: `cd frontend && npm install && npm run dev -- --port 5174`.
Copy `.env.example` files and set `VITE_API_URL=http://localhost:4001/api` locally.
