// ERVO — Stripe webhook: po sėkmingo apmokėjimo išsiunčia užsakymo patvirtinimo laiškus.
// Laiškai siunčiami per Resend (https://resend.com) — paprastas REST API, be papildomų bibliotekų.
//
// Reikalingi Vercel aplinkos kintamieji:
//   STRIPE_SECRET_KEY       — jau turite
//   STRIPE_WEBHOOK_SECRET   — iš Stripe webhook nustatymų (whsec_...)
//   RESEND_API_KEY          — iš Resend (re_...)
//   MAIL_FROM   (nebūtina)  — siuntėjas, pvz. "ERVO <uzsakymai@ervo.lt>". Numatytas: onboarding@resend.dev
//   OWNER_EMAIL (nebūtina)  — jūsų el. paštas pranešimams apie naujus užsakymus. Numatytas: info@ervo.lt

const Stripe = require('stripe');

const fmtEur = (cents) => new Intl.NumberFormat('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((cents || 0) / 100) + ' €';

async function resendSend({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY nesukonfigūruotas');
  const from = process.env.MAIL_FROM || 'ERVO <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error('Resend klaida: ' + (await r.text()));
}

function itemsTableHtml(lineItems) {
  return lineItems
    .map(
      (li) =>
        `<tr>
           <td style="padding:10px 0;border-bottom:1px solid #eee;color:#14130f;font-size:14px;">${li.quantity} × ${li.description}</td>
           <td style="padding:10px 0;border-bottom:1px solid #eee;color:#14130f;font-size:14px;text-align:right;white-space:nowrap;">${fmtEur(li.amount_total)}</td>
         </tr>`
    )
    .join('');
}

function customerEmailHtml(session, rows) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14130f;">
    <div style="text-align:center;font-size:26px;font-weight:800;letter-spacing:.14em;color:#c8901f;margin-bottom:8px;">ERVO</div>
    <h1 style="font-size:22px;text-align:center;margin:14px 0 6px;">Ačiū už užsakymą!</h1>
    <p style="text-align:center;color:#6b6759;font-size:15px;margin:0 0 28px;">Jūsų apmokėjimas gautas. Netrukus susisieksime dėl pristatymo.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <tr><td style="padding:14px 0;font-weight:700;font-size:16px;">Iš viso</td>
      <td style="padding:14px 0;font-weight:700;font-size:16px;text-align:right;">${fmtEur(session.amount_total)}</td></tr>
    </table>
    <div style="background:#f4f1ea;border-radius:12px;padding:16px 20px;margin-top:20px;font-size:13px;color:#6b6759;line-height:1.6;">
      ✔ Nemokamas pristatymas visoje Lietuvoje<br>
      ✔ 30 dienų bandymas namuose<br>
      ✔ 5 metų garantija
    </div>
    <p style="text-align:center;color:#9c978d;font-size:12px;margin-top:28px;">Klausimai? Rašykite info@ervo.lt arba skambinkite +370 655 77536</p>
  </div>`;
}

function ownerEmailHtml(session, rows) {
  const md = session.metadata || {};
  const cust = session.customer_details || {};
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#14130f;">
    <h1 style="font-size:20px;margin:0 0 16px;">🛒 Naujas užsakymas</h1>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <tr><td style="padding:12px 0;font-weight:700;">Iš viso</td>
      <td style="padding:12px 0;font-weight:700;text-align:right;">${fmtEur(session.amount_total)}</td></tr>
    </table>
    <div style="background:#f4f1ea;border-radius:12px;padding:16px 20px;margin-top:18px;font-size:14px;line-height:1.7;">
      <strong>Pirkėjas</strong><br>
      Vardas: ${md.vardas || cust.name || '—'}<br>
      El. paštas: ${cust.email || '—'}<br>
      Telefonas: ${md.telefonas || (cust.phone || '—')}<br>
      Adresas: ${md.adresas || '—'}
    </div>
  </div>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Stripe konfigūracija nepilna' });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Raw body reikalingas parašo patikrinimui — skaitome iš srauto (neliečiame req.body)
  const chunks = [];
  await new Promise((resolve) => {
    req.on('data', (c) => chunks.push(c));
    req.on('end', resolve);
    req.on('error', resolve);
  });
  const rawBody = Buffer.concat(chunks);

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook parašo klaida:', err.message);
    res.status(400).json({ error: 'Neteisingas parašas' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 50 });
      const rows = itemsTableHtml(li.data);
      const customerEmail = (session.customer_details && session.customer_details.email) || session.customer_email;

      if (customerEmail) {
        await resendSend({
          to: customerEmail,
          subject: 'Jūsų ERVO užsakymas patvirtintas',
          html: customerEmailHtml(session, rows),
        });
      }
      await resendSend({
        to: process.env.OWNER_EMAIL || 'info@ervo.lt',
        subject: 'Naujas užsakymas — ERVO',
        html: ownerEmailHtml(session, rows),
      });
    } catch (e) {
      // Nesustabdome webhook'o dėl laiško klaidos — logname ir grąžiname 200,
      // kad Stripe nekartotų be galo. Klaidą matysite Vercel loguose.
      console.error('Užsakymo laiško klaida:', e.message);
    }
  }

  res.status(200).json({ received: true });
};
