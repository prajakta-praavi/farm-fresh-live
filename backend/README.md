# Rushivan Admin Backend (PHP + MySQL)

## Setup
1. Copy `.env.example` to `.env` in `backend/`.
2. Create MySQL database and import `schema.sql`.
3. Point Apache/Nginx to `backend/` (or keep under project URL with rewrite enabled).
4. Ensure PHP PDO MySQL extension is enabled.

## First Admin Login
- Admin user is auto-created from `.env`:
  - `ADMIN_BOOTSTRAP_EMAIL`
  - `ADMIN_BOOTSTRAP_PASSWORD`

## API Base URL for Frontend
- Set frontend env:
  - `VITE_API_BASE_URL=http://localhost/farm-fresh-dwell-main/backend`

## Security
- Keep `RAZORPAY_KEY_SECRET` only in backend `.env`.
- Do not store secret key in frontend.

