# ERVO — Užsakymo patvirtinimo laiškų diegimas

Po sėkmingo apmokėjimo automatiškai išsiunčiami DU laiškai:
- **Klientui** — „Jūsų ERVO užsakymas patvirtintas" (su prekėmis ir suma)
- **Jums** — „Naujas užsakymas" (su kliento vardu, el. paštu, telefonu, adresu)

Veikia per **Stripe webhook** (`api/webhook.js`) + **Resend** (laiškų siuntimas). Žingsniai:

---

## 1. Susikurkite Resend paskyrą (laiškams)

1. Eikite į https://resend.com → **Sign up** (nemokama, 3000 laiškų/mėn)
2. Prisijungę: **API Keys** → **Create API Key** → nukopijuokite raktą (`re_...`)

## 2. Sukurkite Stripe webhook

1. Stripe skydelyje: **Developers → Webhooks → Add endpoint**
   (arba https://dashboard.stripe.com/webhooks)
2. **Endpoint URL:** `https://ervo.vercel.app/api/webhook`
3. **Select events:** pasirinkite **`checkout.session.completed`**
4. **Add endpoint**
5. Atsidariusiame lange raskite **Signing secret** → **Reveal** → nukopijuokite (`whsec_...`)

> Svarbu: webhook turi būti sukurtas tame pačiame režime (Test/Live), kuriuo priiminėsite mokėjimus.

## 3. Įveskite kintamuosius į Vercel

Vercel → jūsų `ervo` projektas → **Settings → Environment Variables** → pridėkite:

| Name | Value |
|------|-------|
| `STRIPE_WEBHOOK_SECRET` | jūsų `whsec_...` |
| `RESEND_API_KEY` | jūsų `re_...` |
| `OWNER_EMAIL` | jūsų el. paštas (kur gauti pranešimus, pvz. `pauforstairs@gmail.com`) |
| `MAIL_FROM` | *(nebūtina kol kas)* — palikite tuščią, veiks `onboarding@resend.dev` |

Išsaugokite → **Redeploy** (Deployments → ⋯ → Redeploy).

## 4. Išbandykite

1. Atlikite testinį pirkimą (Test režime su kortele `4242 4242 4242 4242`)
2. Po apmokėjimo turėtumėte gauti laišką **savo el. paštu** (OWNER_EMAIL)
3. Stripe → **Webhooks** → jūsų endpoint → pamatysite ar užklausa pavyko (žalias „Succeeded")

---

## Svarbu apie kliento laiškus (siuntėjo domenas)

- Su numatytu `onboarding@resend.dev` siuntėju **garantuotai gausite savininko pranešimus**.
- Kad **klientams** laiškai eitų patikimai (nepatektų į šlamštą) ir atrodytų iš `@ervo.lt`, reikia **Resend'e patvirtinti domeną**:
  1. Resend → **Domains → Add Domain** → įveskite `ervo.lt`
  2. Pridėkite nurodytus DNS įrašus pas savo domeno tiekėją
  3. Kai patvirtinta — nustatykite Vercel kintamąjį `MAIL_FROM` = `ERVO <uzsakymai@ervo.lt>`

Iki domeno patvirtinimo klientų laiškai gali nesusiųsti arba pakliūti į šlamštą — tai normalu testavimo etape.

## Kaip veikia (techniškai)

- Klientui sumokėjus, Stripe siunčia įvykį `checkout.session.completed` į `/api/webhook`.
- Funkcija patikrina Stripe parašą (saugumui), paima užsakymo prekes ir išsiunčia abu laiškus per Resend.
- Jei laiškas nepavyktų, webhook vis tiek grąžina „OK" (kad Stripe nekartotų be galo); klaidą matysite Vercel loguose.
