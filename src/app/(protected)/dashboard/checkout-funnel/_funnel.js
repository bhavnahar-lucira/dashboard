/**
 * Stage definitions + the maths behind the Checkout Funnel page: step rates,
 * period deltas and the "where is it leaking" insights. Pure functions only —
 * the page renders whatever these return.
 */

// path = the storefront URL where the step happens, cta = the button text the
// shopper presses there (null when the step is a page load / system event).
// view_cart is deliberately NOT a stage: the cart page is also opened from the
// header cart icon by shoppers who never pressed ATC in this journey, so it is
// not a step between Added to cart and Proceed to checkout. Cart page traffic
// is still reported, as a page, in the Checkout pages card.
export const STAGES = [
  { key: 'view_item', label: 'Product viewed', path: '/products/…', cta: null, note: 'Product page opened', signal: 'view_item' },
  { key: 'atc_click', label: 'Add to cart click', path: '/products/…', cta: 'ADD TO CART', note: 'Any of the 3 ATC buttons · counted before login', signal: 'promoClick "add to cart cta" (GA4 select_promotion)' },
  { key: 'add_to_cart', label: 'Added to cart', path: '/products/…', cta: null, note: 'Item really in cart · after the login popup', signal: 'addToCart → add_to_cart' },
  { key: 'begin_checkout', label: 'Proceed to checkout', path: '/checkout/cart', cta: 'PROCEED TO CHECKOUT', note: 'Recorded when /checkout/shipping opens', signal: 'begin_checkout' },
  { key: 'add_shipping_info', label: 'Continue to payment', path: '/checkout/shipping', cta: 'CONTINUE TO PAYMENT', note: 'Shipping address confirmed', signal: 'add_shipping_info' },
  { key: 'add_payment_info', label: 'Pay now', path: '/checkout/payment', cta: 'PAY NOW', note: 'Sent to the payment gateway', signal: 'add_payment_info' },
  { key: 'purchase', label: 'Purchase', path: '/success', cta: null, note: 'Order placed', signal: 'Shopify website orders / GA4 purchase' },
];

// Checkout pages, the CTA stage that leaves each one, and its button text.
export const CHECKOUT_PAGES = [
  { path: '/checkout/cart', label: 'Cart', ctaStage: 'begin_checkout', cta: 'PROCEED TO CHECKOUT' },
  { path: '/checkout/shipping', label: 'Shipping', ctaStage: 'add_shipping_info', cta: 'CONTINUE TO PAYMENT' },
  { path: '/checkout/payment', label: 'Payment', ctaStage: 'add_payment_info', cta: 'PAY NOW' },
  { path: '/success', label: 'Order success', ctaStage: null, cta: null },
];

/** Average cart value (INR) carried by one event, from GA4's `value` param. */
export function avgValue(values, key) {
  const v = values?.[key];
  return v && v.count > 0 && v.value > 0 ? v.value / v.count : NaN;
}

export const inrShort = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

export const duration = (sec) => {
  if (!Number.isFinite(sec)) return '—';
  const s = Math.round(sec);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

// The funnel proper starts at the ATC click; product views are context.
export const ENTRY = 'atc_click';

export const CTA_LABELS = {
  'header sticky cta': 'Header sticky ATC',
  'pdp page cta': 'On-page ATC',
  'bottom sticky cta': 'Bottom sticky ATC',
};

export const BREAKDOWN_OPTIONS = [
  { key: 'channel', label: 'Channel' },
  { key: 'sourceMedium', label: 'Source / Medium' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'device', label: 'Device' },
  { key: 'newVsReturning', label: 'New vs returning' },
  { key: 'city', label: 'City' },
  { key: 'landingPage', label: 'Landing page' },
];

// What to look at when a given step is the leak.
const FIXES = {
  'view_item>atc_click': 'PDP is not convincing — check price/offer clarity, variant selection and ATC button visibility.',
  'atc_click>add_to_cart': 'Shoppers click ATC but never get the item in cart — this is the guest login wall (1 Oct). Test inline OTP, or allow guest add-to-cart and ask for login at checkout.',
  'add_to_cart>begin_checkout': 'Added but never checked out — review the post-ATC drawer/redirect to the cart, price/savings breakup, coupon friction, delivery promise and the Proceed to Checkout CTA on /checkout/cart.',
  'begin_checkout>add_shipping_info': 'Shipping page leak — address form friction, pincode serviceability and saved-address handling.',
  'add_shipping_info>add_payment_info': 'Payment page leak — payment options, coins/coupon steps and the Pay Now CTA.',
  'add_payment_info>purchase': 'Pay Now does not end in an order — check gateway failures (Razorpay / PhonePe / Partial COD) and the success-page redirect.',
};

export const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-IN') : '—');
export const pct = (r, digits = 1) => (Number.isFinite(r) ? `${(r * 100).toFixed(digits)}%` : '—');
export const inr = (n) => (Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—');
export const rate = (a, b) => (b > 0 ? a / b : NaN);

/**
 * Value of one stage for the chosen metric. Purchase comes from Shopify when
 * `orders` is passed (exact), otherwise from the GA4 purchase event.
 */
export function stageValue(stages, key, metric, orders) {
  if (key === 'purchase' && orders != null) return orders;
  return stages?.[key]?.[metric] || 0;
}

export function funnelRows(stages, metric, orders, prevStages, prevOrders) {
  return STAGES.map((s, i) => {
    const value = stageValue(stages, s.key, metric, orders);
    const prev = prevStages ? stageValue(prevStages, s.key, metric, prevOrders) : NaN;
    const before = i > 0 ? stageValue(stages, STAGES[i - 1].key, metric, orders) : NaN;
    const prevBefore = i > 0 && prevStages ? stageValue(prevStages, STAGES[i - 1].key, metric, prevOrders) : NaN;
    return {
      ...s,
      value,
      prev,
      stepRate: i > 0 ? rate(value, before) : NaN,
      prevStepRate: i > 0 ? rate(prev, prevBefore) : NaN,
      dropped: i > 0 ? Math.max(0, before - value) : 0,
      ofEntry: rate(value, stageValue(stages, ENTRY, metric, orders)),
    };
  });
}

const transitionKey = (row, i, rows) => `${rows[i - 1].key}>${row.key}`;

export function buildInsights(data, { metric, useShopify }) {
  if (!data) return [];
  const orders = useShopify ? data.orders?.orders : undefined;
  const prevOrders = useShopify ? data.previousOrders?.orders : undefined;
  const rows = funnelRows(data.totals, metric, orders, data.previousTotals, prevOrders);
  const entryIdx = rows.findIndex((r) => r.key === ENTRY);
  const steps = rows.map((r, i) => ({ r, i })).filter(({ i }) => i > entryIdx);
  const out = [];

  // Low-quality traffic — lots of ATC clicks that never become real adds.
  const t = data.totals;
  const siteAdd = rate(t.add_to_cart[metric], t.atc_click[metric]);
  const minBase = Math.max(30, (t.atc_click[metric] || 0) * 0.03);
  const junk = (data.breakdown?.rows || [])
    .filter((row) => row.stages.atc_click[metric] >= minBase)
    .map((row) => ({ row, add: rate(row.stages.add_to_cart[metric], row.stages.atc_click[metric]) }))
    .filter((x) => x.add < siteAdd * 0.4)
    .sort((a, b) => b.row.stages.atc_click[metric] - a.row.stages.atc_click[metric]);
  const junkDrops = junk.reduce((sum, x) => sum + Math.max(0, x.row.stages.atc_click[metric] - x.row.stages.add_to_cart[metric]), 0);

  // 1. Biggest leak — most people lost between two consecutive steps.
  const leak = steps.reduce((a, b) => (b.r.dropped > (a?.r.dropped ?? -1) ? b : a), null);
  if (leak && leak.r.dropped > 0) {
    const from = rows[leak.i - 1];
    out.push({
      tone: 'bad',
      title: `Biggest leak: ${from.label} → ${leak.r.label}`,
      body: `${fmt(leak.r.dropped)} of ${fmt(from.value)} ${metric} (${pct(1 - leak.r.stepRate)}) stop here. ${FIXES[transitionKey(leak.r, leak.i, rows)] || ''}${
        leak.r.key === 'add_to_cart' && junkDrops > 0
          ? ` Note: ${fmt(junkDrops)} of these drops (${pct(rate(junkDrops, leak.r.dropped), 0)}) come from the low-quality segments flagged below.`
          : ''}`,
    });
  }

  // Weakest step after the item is really in the cart — lowest conversion rate,
  // i.e. the checkout page that most needs work regardless of volume.
  const addIdx = rows.findIndex((r) => r.key === 'add_to_cart');
  const weakest = steps
    .filter(({ i, r }) => i > addIdx && Number.isFinite(r.stepRate) && r.stepRate <= 1)
    .reduce((a, b) => (b.r.stepRate < (a?.r.stepRate ?? 2) ? b : a), null);
  if (weakest && weakest.r.key !== leak?.r.key) {
    const from = rows[weakest.i - 1];
    out.push({
      tone: 'bad',
      title: `Weakest checkout step: ${from.label} → ${weakest.r.label} (${pct(weakest.r.stepRate)})`,
      body: `Lowest conversion of any step after add-to-cart. ${FIXES[transitionKey(weakest.r, weakest.i, rows)] || ''}`,
    });
  }

  // 2. Weakest step relative to last period.
  const moves = steps
    // A rate over 100% (e.g. checkouts of carts filled in an earlier period) is
    // not a step conversion, so it never drives a "better/worse" call.
    .filter(({ r }) => Number.isFinite(r.stepRate) && Number.isFinite(r.prevStepRate) && r.stepRate <= 1 && r.prevStepRate <= 1)
    .map(({ r, i }) => ({ r, i, delta: r.stepRate - r.prevStepRate }));
  const worst = moves.reduce((a, b) => (b.delta < (a?.delta ?? 0) ? b : a), null);
  if (worst && worst.delta < -0.02) {
    out.push({
      tone: 'warn',
      title: `${rows[worst.i - 1].label} → ${worst.r.label} got worse`,
      body: `Step conversion fell ${(Math.abs(worst.delta) * 100).toFixed(1)} pts vs the previous period (${pct(worst.r.prevStepRate)} → ${pct(worst.r.stepRate)}). Check what changed on this page in this window.`,
    });
  }
  const best = moves.reduce((a, b) => (b.delta > (a?.delta ?? 0) ? b : a), null);
  if (best && best.delta > 0.02) {
    out.push({
      tone: 'ok',
      title: `${rows[best.i - 1].label} → ${best.r.label} improved`,
      body: `Up ${(best.delta * 100).toFixed(1)} pts vs the previous period (${pct(best.r.prevStepRate)} → ${pct(best.r.stepRate)}).`,
    });
  }

  // 3. Low-quality traffic — lots of ATC clicks that never become real adds.
  if (junk.length) {
    const clicks = junk.reduce((s, x) => s + x.row.stages.atc_click[metric], 0);
    out.push({
      tone: 'bad',
      title: `${junk.length} segment${junk.length > 1 ? 's' : ''} click ATC but almost never add`,
      body: `${junk.slice(0, 3).map((x) => `${x.row.key || '(not set)'} (${pct(x.add)} added)`).join(', ')} — ${fmt(clicks)} ATC-click ${metric} vs a ${pct(siteAdd)} site average. Likely accidental / bot-like clicks or a broken landing; they inflate the top of the funnel.`,
    });
  }

  // 4. Best segment by reaching checkout.
  const strong = (data.breakdown?.rows || [])
    .filter((row) => row.stages.atc_click[metric] >= minBase)
    .map((row) => ({ row, r: rate(row.stages.begin_checkout[metric], row.stages.atc_click[metric]) }))
    .sort((a, b) => b.r - a.r)[0];
  if (strong && Number.isFinite(strong.r)) {
    out.push({
      tone: 'ok',
      title: `Best segment: ${strong.row.key || '(not set)'}`,
      body: `${pct(strong.r)} of its ATC-click ${metric} reach checkout vs ${pct(rate(t.begin_checkout[metric], t.atc_click[metric]))} overall — worth more budget.`,
    });
  }

  // 5. Device gap on Added to cart -> Pay now. Measured from the real add, not
  // the ATC click, so low-quality clicks (mostly mobile display) don't skew it.
  const dev = Object.fromEntries((data.devices || []).map((d) => [d.key, d.stages]));
  if (dev.mobile && dev.desktop) {
    const m = rate(dev.mobile.add_payment_info[metric], dev.mobile.add_to_cart[metric]);
    const d = rate(dev.desktop.add_payment_info[metric], dev.desktop.add_to_cart[metric]);
    if (Number.isFinite(m) && Number.isFinite(d) && Math.abs(m - d) > 0.03) {
      const worse = m < d ? 'Mobile' : 'Desktop';
      out.push({
        tone: 'warn',
        title: `${worse} checkout converts worse`,
        body: `Added to cart → Pay now: mobile ${pct(m)} vs desktop ${pct(d)}. Walk the ${worse.toLowerCase()} cart, shipping and payment pages end to end.`,
      });
    }
  }

  // 6. Payment completion + GA4 tracking gap + money left at Pay now.
  if (data.orders) {
    const pay = data.totals.add_payment_info.sessions;
    const lost = Math.max(0, pay - data.orders.orders) * avgValue(data.values, 'add_payment_info');
    out.push({
      tone: rate(data.orders.orders, pay) < 0.3 ? 'warn' : 'info',
      title: `Pay now → order: ${pct(rate(data.orders.orders, pay))}`,
      body: `${fmt(data.orders.orders)} Shopify website orders from ${fmt(pay)} Pay-now sessions${
        Number.isFinite(lost) ? ` — about ${inrShort(lost)} of carts reached the gateway without becoming an order` : ''}. GA4 recorded ${fmt(data.totals.purchase.clicks)} purchases (${pct(rate(data.totals.purchase.clicks, data.orders.orders), 0)} of real orders)${
        data.totals.purchase.clicks < data.orders.orders
          ? ', so GA4 purchase under-reports.'
          : data.totals.purchase.clicks > data.orders.orders
            ? ' — more than Shopify, so GA4 is double-counting (success-page reloads) or this range includes pre-headless orders.'
            : '.'}`,
    });
  }

  // 7. Repeat taps — a CTA clicked many times per session means it is not
  // responding (slow / failing), not that shoppers are keen.
  const repeat = ['atc_click', 'add_shipping_info', 'add_payment_info']
    .map((key) => ({ key, ratio: rate(t[key].clicks, t[key].sessions) }))
    .filter((x) => x.ratio >= 1.6)
    .sort((a, b) => b.ratio - a.ratio)[0];
  if (repeat) {
    const st = STAGES.find((s) => s.key === repeat.key);
    out.push({
      tone: 'warn',
      title: `"${st.cta}" tapped ${repeat.ratio.toFixed(1)}× per session`,
      body: `${fmt(t[repeat.key].clicks)} taps from ${fmt(t[repeat.key].sessions)} sessions on ${st.path}. Repeated taps usually mean the button gives no feedback or the step fails — add a loading state, disable it while processing, and check errors for this step.`,
    });
  }

  // 8. Page reached vs CTA pressed — the real per-page conversion.
  const pages = data.pages || {};
  const pageRates = CHECKOUT_PAGES.filter((pg) => pg.ctaStage && pages[pg.path]?.sessions >= 20)
    .map((pg) => ({ pg, r: rate(t[pg.ctaStage].sessions, pages[pg.path].sessions) }))
    .filter((x) => Number.isFinite(x.r))
    .sort((a, b) => a.r - b.r);
  if (pageRates.length) {
    const w = pageRates[0];
    out.push({
      tone: w.r < 0.4 ? 'bad' : 'warn',
      title: `${w.pg.path}: only ${pct(w.r, 0)} press "${w.pg.cta}"`,
      body: `${fmt(pages[w.pg.path].sessions)} sessions opened the ${w.pg.label.toLowerCase()} page, ${fmt(t[w.pg.ctaStage].sessions)} pressed its CTA — the lowest page conversion in checkout. Avg ${duration(rate(pages[w.pg.path].engagementSec, pages[w.pg.path].sessions))} engaged per session.`,
    });
  }

  // 9. Products that get ATC clicks but never get added.
  const deadProducts = (data.products || []).filter((pr) => pr.atcClicks >= 20 && pr.added === 0);
  if (deadProducts.length) {
    out.push({
      tone: 'bad',
      title: `${deadProducts.length} product${deadProducts.length > 1 ? 's' : ''} with ATC clicks but zero adds`,
      body: `${deadProducts.slice(0, 3).map((pr) => `${pr.name} (${fmt(pr.atcClicks)} clicks)`).join(', ')}. Open these PDPs and try adding to cart — check variant/stock, price and the ATC button; also check whether their traffic is the low-quality ad traffic above.`,
    });
  }

  return out;
}
