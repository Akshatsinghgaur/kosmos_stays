# Kosmos Stays UI and booking offers update

## Included
- Mobile-first green/white UI refresh based on the provided reference.
- Four primary destinations plus the centered Add action: Home, Bookings, Offers and More. Units, statistics, subscription, profile and cleaner setup are inside the More page.
- Dark mode saved on this device.
- Statistics based on the current bookings supplied by the app and grouped by unit.
- Subscription information page with ₹299 / unit / 28 days and WhatsApp contact (`+91 8796485062`).
- Browser-side JPEG compression for supported ID images before upload.
- Admin booking offers: post date/time/price, edit, cancel, delete, assign/reassign hosts.
- Atomic one-host-only acceptance for open offers.
- Admin can immediately cancel an active unit subscription.
- Favicon, Apple touch icon, PWA manifest and home-screen icons.

## Deployment
1. Review and copy these source changes into the existing Git repository; do not copy any `.env` file from a ZIP.
2. Commit and push to the production branch. Cloudflare should rebuild the frontend. Koyeb should redeploy the backend.
3. The backend route `/api/offers` is new. It is included in `backend/src/server.js`.
4. Confirm `VITE_API_URL` is set at frontend build time to the deployed Koyeb API URL ending in `/api`.
5. Test admin post/edit/assign/cancel/delete and have two different host accounts attempt to accept the same offer. Only one should succeed.

## Important security note
The existing ID photo storage in this project uses local filesystem storage. On ephemeral hosting this is not durable, and the code in this update does not migrate files to private persistent object storage. Do not use real guest ID photos in production until private, persistent storage and authorization are configured and tested. Browser compression reduces transfer size but does not solve storage durability or access-control concerns.

## App installation
On supported mobile browsers, open the HTTPS app URL and choose “Add to Home Screen” / “Install app”. The manifest and icons are included. Cloudflare's deployment must serve the manifest and PNG icons at the root paths.
