# Corner Shop POS (MVP)

Point of sale for a small shop selling **clothes**, **gifts**, and **empty boxes**.

## Rules locked in
- Payments: **Cash** and **QR** only
- Currencies: **THB** and **LAK**
- Pricing: **one price** in base currency + shop FX (`LAK per 1 THB`)
- Boxes: sold as empty boxes (not delivery packaging)

## Run locally

```bash
cd pos
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `DATABASE_URL`, local data is stored in `data/store.json` (created on first request).

## Deploy on Vercel (Postgres required)

Vercel serverless functions cannot keep a JSON file on disk, so production uses **Neon Postgres**.

1. Deploy the project on Vercel.
2. In the Vercel project: **Storage → Create Database → Neon** (free plan is enough).
   This sets `DATABASE_URL` automatically.
3. Redeploy so the new env var is picked up.

Or create a database at [neon.tech](https://neon.tech), copy the connection string, and add it as `DATABASE_URL` in Vercel **Settings → Environment Variables**.

## Screens
- **Sell** — cart, size/color for clothes, pay Cash/QR in THB or LAK
- **Products** — catalog + stock (clothes / gift / box)
- **Reports** — today totals by cash/QR and THB/LAK, low stock, void
- **Settings** — shop name, base currency, FX rate, QR note
