# Deployment & Hosting (Hostinger)

The customer storefront and admin dashboard are built into a unified production build on Hostinger at
https://www.bemsfarms.com. The backend Express API runs as a Node.js service on Hostinger.

## Production Build & Deploy

The repository build script (`npm run build`) compiles both the customer storefront (`/client`) and the admin dashboard (`/Bems-Farms-Admin-Front-end`) into the `dist/` directory:
- Customer storefront: `dist/index.html`
- Admin dashboard: `dist/admin/index.html`

Set VITE_API_URL to the production API URL including /api, and preserve
VITE_GOOGLE_CLIENT_ID. VITE_ADMIN_URL and VITE_STOREFRONT_URL are no longer used:
frontend routing stays on the current origin.

Customer routes use dist/index.html; /admin routes use dist/admin/index.html.
Both interfaces use the same session keys. On entering the other interface,
/auth/me verifies the stored token before protected content is rendered.

## Local development

Run npm run dev inside client and Bems-Farms-Admin-Front-end.
Open http://localhost:5173 for both interfaces. The client development server
proxies /admin to the internal admin server on port 5174. Use the same hostname
throughout; localhost and 127.0.0.1 do not share browser storage.
Both frontends default to https://api.bemsfarms.com/api. No local backend is required.
VITE_API_URL can override the API address. Preview actions use the existing API.

## Validation

npm run test:routing checks roles, safe customer destinations and shared-origin URLs.
npm run build builds and assembles both interfaces. Server npm test covers syntax,
authorization middleware and isolated startup checks. Real sign-in still needs
verification against a configured backend with customer and staff test accounts.

These files do not change existing hosting dashboard settings automatically.
