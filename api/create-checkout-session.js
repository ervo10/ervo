// ERVO — Stripe Checkout sesijos kūrimas (Vercel serverless funkcija)
// Kainas tvirtina SERVERIS pagal produkto ID — naršyklėje atsiųsta kaina
// priimama tik jei ji sutampa su leidžiama (apsauga nuo kainų klastojimo).

const Stripe = require('stripe');

// Leidžiamos kainos pagal produkto ID šeimą (eurais)
const PRICE_RULES = [
  { test: (id) => id.startsWith('pro-air'), allowed: [299] },              // ERVO Pro Premium (juoda/pilka)
  { test: (id) => id === 'smart', allowed: [1299] },                       // ERVO Smart Aria
  { test: (id) => id === 'lift-bundle', allowed: [487] },                  // Stalo + kėdės komplektas
  { test: (id) => id.startsWith('desk-lift') || id.startsWith('ervo-lift-pro'), allowed: [190, 209] }, // Lift Pro stalai (60x120 / 70x140)
];

function trustedPrice(id, clientPrice) {
  const rule = PRICE_RULES.find((r) => r.test(id));
  if (!rule) return null;
  const p = Number(clientPrice);
  return rule.allowed.includes(p) ? p : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe raktas nesukonfigūruotas serveryje.' });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { items, customer } = body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Krepšelis tuščias.' });
      return;
    }

    const origin = req.headers.origin || 'https://' + req.headers.host;

    const line_items = [];
    for (const it of items) {
      const id = String(it.id || '');
      const price = trustedPrice(id, it.price);
      if (price === null) {
        res.status(400).json({ error: 'Neatpažinta prekė arba kaina: ' + id });
        return;
      }
      const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));

      // Nuotraukai Stripe reikia absoliutaus https URL
      const images = [];
      if (it.img) {
        const img = String(it.img);
        const abs = /^https?:\/\//.test(img) ? img : origin + '/' + encodeURI(img).replace(/^\//, '');
        if (/^https:\/\//.test(abs)) images.push(abs);
      }

      line_items.push({
        quantity: qty,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(price * 100),
          product_data: {
            name: String(it.name || 'ERVO produktas').slice(0, 250),
            images,
          },
        },
      });
    }

    // Pristatymo/kontaktų info išsaugome Stripe metaduomenyse (matysite Stripe skydelyje)
    const metadata = {};
    if (customer && typeof customer === 'object') {
      metadata.vardas = [customer.fname, customer.lname].filter(Boolean).join(' ').slice(0, 200);
      metadata.telefonas = String(customer.phone || '').slice(0, 50);
      metadata.adresas = [customer.address, customer.city, customer.zip].filter(Boolean).join(', ').slice(0, 350);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // kortelė + Apple Pay / Google Pay (piniginukai rodomi automatiškai palaikomuose įrenginiuose)
      line_items,
      locale: 'lt',
      customer_email: customer && customer.email ? String(customer.email) : undefined,
      metadata,
      success_url: origin + '/checkout.html?success=1',
      cancel_url: origin + '/checkout.html?canceled=1',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe klaida:', err);
    res.status(500).json({ error: 'Nepavyko sukurti apmokėjimo sesijos. Bandykite dar kartą.', details: err && err.message });
  }
};
