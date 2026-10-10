# Kosmos Stays — final project package

## Included
- Existing app source merged with the UI/booking-offer update.
- Five-item mobile navigation with a centered Add action; More page; dark mode.
- Stats, unit subscription info and WhatsApp contact; booking offers; admin subscription cancellation.
- Favicon, Apple touch icon, PWA manifest and home-screen icons.
- Existing source files and lockfiles, without node_modules, Git history, or environment secrets.

## Before deploying
1. Back up the existing repository and database.
2. Extract this archive and copy the contents of `kosmos-stays/` into the existing Git repository. Do not delete or replace your existing `.git` directory or `.env` files.
3. Confirm the frontend build environment variable is set in Cloudflare:
   `VITE_API_URL=https://great-chrissie-akshatsinghwo29-5d564253.koyeb.app/api`
4. Check that Koyeb has the existing production environment variables configured. Do not commit secrets.
5. Run frontend build from `frontend/`: `npm ci && npm run build`.
6. Run backend syntax checks from the repository root:
   `node --check backend/src/server.js`
   `node --check backend/src/routes/offers.js`
7. Commit and push changes to the configured branch. Verify Cloudflare and Koyeb deployment logs before testing.

## Important limitations / production safety
- The project still requires a real end-to-end deployment test. A successful syntax check does not prove API behavior or the frontend build.
- Customer ID images must not be used for real guest data until private, persistent object storage (for example a private R2 bucket) and authenticated per-booking access are implemented and tested. Local/temp uploads can disappear on redeploy and must not be exposed publicly.
- Admin account permissions must be checked against the production database before use.
- Keep `.env`, database credentials, JWT secrets, and Telegram tokens out of GitHub. Rotate any secrets previously exposed in chat or committed to a repository.
