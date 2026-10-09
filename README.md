# Kosmos Stays

Mobile-first booking register for hosts with units, bookings, subscription status, statistics, CSV export, cleaner Telegram flow and admin controls. Includes support contact details: **+91 8796485062** and **support@kosmosstays.in**.

## Start locally
1. Copy `backend/.env.example` to `backend/.env`, fill in required values, and set `PORT=4001`.
2. In one terminal: `cd backend && npm install && npm run dev`.
3. Copy `frontend/.env.example` to `frontend/.env`.
4. In another terminal: `cd frontend && npm install && npm run dev -- --port 5174`.

## Production status
This is a production-oriented MVP package, not yet safe for real customer ID documents until persistent private object storage is integrated and tested. Uploaded IDs currently use local disk, which is ephemeral on Koyeb. See [DEPLOYMENT.md](DEPLOYMENT.md) for the Koyeb + Cloudflare Pages + Atlas setup and launch checklist.

Public sign-up creates host accounts only. To give the verified owner account admin access, set `ADMIN_EMAIL`, register that email, and run `node promote-admin.js` from `backend/` against the production database. Remove the script from the deployed repo after use.

Never commit `.env` files, customer ID photos, JWTs, MongoDB credentials or Telegram tokens. Rotate any credentials previously shared in chat before production.
