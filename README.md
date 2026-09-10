# Corner Shop POS (MVP)

Point of sale for a small shop selling **clothes**, **gifts**, and **empty boxes**.

## Rules locked in
- Payments: **Cash** and **QR** only
- Currencies: **THB** and **LAK**
- Pricing: **one price** in base currency + shop FX (`LAK per 1 THB`)
- Boxes: sold as empty boxes (not delivery packaging)

## Run

```bash
cd pos
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Screens
- **Sell** — cart, size/color for clothes, pay Cash/QR in THB or LAK
- **Products** — catalog + stock (clothes / gift / box)
- **Reports** — today totals by cash/QR and THB/LAK, low stock, void
- **Settings** — shop name, base currency, FX rate, QR note

Data is stored in `pos/data/store.json` (created on first request).
