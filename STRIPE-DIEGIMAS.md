# ERVO — Stripe apmokėjimo diegimas

Svetainė paruošta priimti apmokėjimus kortele + Apple Pay / Google Pay per **Stripe Checkout**.
Kad tai veiktų, reikia įkelti svetainę į **Vercel** ir įvesti savo Stripe raktą. Žingsniai žemiau.

---

## 1. Susikurkite Stripe paskyrą

1. Eikite į https://dashboard.stripe.com/register
2. Registruokitės. Kaip verslo tipą pasirinkite **„Individual / Sole proprietor"** (fizinis asmuo / individuali veikla) — įmonės nereikia.
3. Užpildykite duomenis ir nurodykite savo **asmeninį IBAN** išmokoms.
4. Kol paskyra dar netikrinta, galite iškart naudoti **testinį režimą** (Test mode) — pirkimus imituosite bandomąja kortele `4242 4242 4242 4242`, galiojimas bet kokia ateities data, CVC bet koks.

## 2. Nusikopijuokite API raktus

Stripe skydelyje: **Developers → API keys**. Rasite du raktus:
- **Publishable key** (`pk_...`) — viešas, nebūtinas šiam sprendimui.
- **Secret key** (`sk_...`) — **slaptas**. Jo NIEKAM nerodykite ir NEDĖKITE į kodą.

## 3. Įkelkite svetainę į Vercel

1. Sukurkite paskyrą https://vercel.com (galima prisijungti su GitHub).
2. Įkelkite šį aplanką kaip projektą:
   - **Paprasčiausia:** įkelkite aplanką į GitHub repozitoriją, tada Vercel → „Add New Project" → pasirinkite repozitoriją.
   - **Arba** įdiekite Vercel CLI: `npm i -g vercel`, tada šiame aplanke paleiskite `vercel`.
3. Vercel automatiškai atpažins `package.json` ir įdiegs `stripe`, o `api/` aplanko funkcijas pavers serverless endpoint'ais.

## 4. Įveskite slaptą raktą Vercel'yje

Vercel projekte: **Settings → Environment Variables** → pridėkite:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | jūsų `sk_test_...` (testui) arba `sk_live_...` (realiam) |

Išsaugokite ir **perdiekite** (Deployments → Redeploy), kad kintamasis įsigaliotų.

## 5. Išbandykite

1. Atidarykite savo Vercel svetainę (pvz. `https://ervo.vercel.app`).
2. Įdėkite prekę į krepšelį → **Apmokėti** → užpildykite formą → **Patvirtinti užsakymą**.
3. Būsite nukreipti į Stripe apmokėjimo puslapį.
4. Testiniu režimu apmokėkite kortele `4242 4242 4242 4242`.
5. Grįšite atgal į `checkout.html?success=1` — matysite „Ačiū už užsakymą!" ir krepšelis išsivalys.

## 6. Perjungimas į realius mokėjimus

1. Stripe skydelyje užbaikite paskyros aktyvavimą (asmens tapatybė, IBAN).
2. Perjunkite iš **Test mode** į **Live mode**, nukopijuokite `sk_live_...`.
3. Vercel'yje pakeiskite `STRIPE_SECRET_KEY` į `sk_live_...` ir perdiekite.

---

## Kaip veikia (techniškai)

- `api/create-checkout-session.js` — serverless funkcija. Gauna krepšelį, **serveryje patikrina kainas** (naršyklėje suklastota kaina atmetama), sukuria Stripe sesiją ir grąžina nukreipimo nuorodą.
- `checkout.html` — pateikus formą, siunčia krepšelį funkcijai ir nukreipia klientą į Stripe. Grįžus su `?success=1`, parodo padėką ir išvalo krepšelį.
- Pristatymo/kontaktų duomenys išsaugomi Stripe sesijos **metaduomenyse** — matysite juos prie kiekvieno mokėjimo Stripe skydelyje.

## Ką verta pridėti vėliau

- **Webhook** (`checkout.session.completed`) — patikimam užsakymų patvirtinimui ir el. laiškų siuntimui (net jei klientas uždaro naršyklę).
- **El. laiškų siuntimas** (pvz. per Resend ar SendGrid) — automatiniai užsakymo patvirtinimai.
- **Banko nuoroda (Swedbank/SEB)** — per Stripe galima įjungti „iDEAL/Bancontact" tipo metodus arba naudoti Paysera/Montonio Baltijos bankams.

## Svarbu

- Slaptas raktas (`sk_...`) laikomas TIK Vercel aplinkos kintamuosiuose — niekada kode ar naršyklėje.
- Testinis režimas nepriima realių pinigų — tobula bandymams.
- Mokestis (ES kortelės): apie 1,4 % + 0,25 € už operaciją.
