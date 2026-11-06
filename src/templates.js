const { money, TIMEZONE, sendTimeLabel } = require('./invoice');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sellerLines(seller) {
  return [seller.address, seller.phone].filter(Boolean).map(esc).join('<br>');
}

/* ---------------------------------------------------------------- web page */

function renderPage(inv, status) {
  const rows = inv.lines
    .map(
      (l) => `
          <tr>
            <td>
              <span class="item-name">${esc(l.name)}</span>
              <span class="item-desc">${esc(l.description)}</span>
            </td>
            <td class="num">${l.qty}</td>
            <td class="num col-unit">${money(l.unitPrice)}</td>
            <td class="num">${money(l.total)}</td>
          </tr>`
    )
    .join('');

  const previewNotice = status.live
    ? ''
    : `<p class="notice">Preview mode: email settings aren’t filled in yet, so the daily email is written to the server log instead of being sent. Add your SMTP details to <code>.env</code> and restart to send real emails.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(inv.number)} for ${esc(inv.customer.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    color-scheme: light;
    --paper: #EEF0F4;
    --sheet: #FFFFFF;
    --ink: #1B2130;
    --muted: #5D6577;
    --rule: #E2E5EB;
    --card: #23395B;
    --card-edge: #2F4C78;
    --foil: #C9CED6;
    --ok: #1F7A52;
    --notice-bg: #FFF4E0;
    --notice-ink: #7A4A00;
    --focus: #2F6FED;
    --display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
    --body: "Instrument Sans", "Segoe UI", system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --paper: #0F1218;
      --sheet: #181D27;
      --ink: #E7EAF0;
      --muted: #9AA3B5;
      --rule: #2A3140;
      --card: #2E4A75;
      --card-edge: #41639A;
      --foil: #8E96A3;
      --ok: #5CC495;
      --notice-bg: #2C2414;
      --notice-ink: #F0C27A;
      --focus: #7FA8FF;
    }
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font: 400 16px/1.55 var(--body);
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 760px; margin: 0 auto; padding: 48px 20px 72px; }

  .sheet {
    background: var(--sheet);
    border: 1px solid var(--rule);
    border-radius: 20px;
    padding: clamp(24px, 5vw, 44px);
  }

  .top {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: start;
  }
  h1 {
    font: 700 clamp(2.4rem, 7vw, 3.5rem)/1 var(--display);
    letter-spacing: -0.025em;
    margin: 0 0 14px;
  }
  .meta { margin: 0; color: var(--muted); }
  .meta b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }

  /* The recharge card is the one bold element on the page. */
  .card {
    width: 216px;
    aspect-ratio: 1.586;
    border-radius: 14px;
    background: linear-gradient(140deg, var(--card) 0%, var(--card) 55%, var(--card-edge) 100%);
    color: #fff;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transform: rotate(-4deg);
    box-shadow: 0 22px 32px -20px rgba(15, 30, 60, 0.65);
    animation: settle 700ms cubic-bezier(.2, .8, .2, 1) both;
  }
  .card-value {
    font: 700 3rem/1 var(--display);
    letter-spacing: -0.03em;
  }
  .strip {
    display: block;
    height: 26px;
    border-radius: 4px;
    background: repeating-linear-gradient(115deg, var(--foil) 0 6px, #DDE1E7 6px 9px);
    color: rgba(27, 33, 48, .55);
    font: 600 12px/26px var(--body);
    letter-spacing: .2em;
    text-align: center;
  }
  .card-foot { font-size: 13px; opacity: .8; }
  @keyframes settle {
    from { transform: rotate(-12deg) translateY(-14px); opacity: 0; }
    to   { transform: rotate(-4deg); opacity: 1; }
  }

  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin: 40px 0 32px;
    padding-top: 24px;
    border-top: 1px solid var(--rule);
  }
  .parties h2 {
    font: 500 14px/1.4 var(--body);
    color: var(--muted);
    margin: 0 0 4px;
  }
  .parties p { margin: 0; }
  .party-name { font-weight: 600; font-size: 1.125rem; }
  .party-extra { color: var(--muted); font-size: 15px; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font: 500 14px/1.4 var(--body);
    color: var(--muted);
    padding: 0 0 10px;
    border-bottom: 1px solid var(--rule);
  }
  td { padding: 16px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
  th.num, td.num { text-align: right; padding-left: 16px; font-variant-numeric: tabular-nums; }
  .item-name { display: block; font-weight: 600; }
  .item-desc { display: block; color: var(--muted); font-size: 15px; }

  .totals { margin: 20px 0 0 auto; width: min(100%, 280px); }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-variant-numeric: tabular-nums; }
  .totals .sub { color: var(--muted); }
  .totals .due { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--rule); align-items: baseline; }
  .totals .due span:last-child { font: 700 2rem/1 var(--display); letter-spacing: -0.02em; }

  .thanks { margin: 36px 0 0; color: var(--muted); font-size: 15px; }

  /* Schedule sits on the paper, not on the sheet: it's about the app, not the invoice. */
  .schedule { margin-top: 36px; padding: 0 4px; }
  .schedule h2 { font: 700 1.375rem/1.2 var(--display); margin: 0 0 8px; }
  .schedule > p { margin: 0 0 16px; max-width: 60ch; }
  .facts { display: flex; flex-wrap: wrap; gap: 12px 40px; margin: 0 0 20px; }
  .facts dt { color: var(--muted); font-size: 14px; }
  .facts dd { margin: 0; font-weight: 600; }
  .live-dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--ok); margin-right: 8px; vertical-align: middle;
  }
  .notice {
    background: var(--notice-bg); color: var(--notice-ink);
    border-radius: 10px; padding: 12px 14px; font-size: 15px; max-width: 64ch;
  }
  .notice code { font-size: 14px; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
  button {
    font: 600 15px/1 var(--body);
    color: var(--sheet);
    background: var(--ink);
    border: 0;
    border-radius: 999px;
    padding: 13px 20px;
    cursor: pointer;
  }
  button:disabled { opacity: .55; cursor: progress; }
  a { color: var(--ink); text-underline-offset: 3px; }
  button:focus-visible, a:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  .nowrap { white-space: nowrap; }
  #send-result { min-height: 1.55em; margin: 12px 0 0; color: var(--muted); }

  @media (max-width: 560px) {
    .top { grid-template-columns: 1fr; }
    .card { width: 190px; order: -1; }
    .parties { grid-template-columns: 1fr; }
    .col-unit { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card { animation: none; }
  }
</style>
</head>
<body>
<main>
  <article class="sheet" aria-labelledby="invoice-title">
    <div class="top">
      <div>
        <h1 id="invoice-title">Invoice</h1>
        <p class="meta">Number <b>${esc(inv.number)}</b></p>
        <p class="meta">Issued <b>${esc(inv.issued)}</b></p>
        <p class="meta">Due on receipt</p>
      </div>
      <div class="card" role="img" aria-label="Prepaid recharge card worth ${money(inv.total)}">
        <span class="card-value">${money(inv.total).replace('.00', '')}</span>
        <span class="strip" aria-hidden="true">•••• •••• ••••</span>
        <span class="card-foot">Prepaid recharge</span>
      </div>
    </div>

    <section class="parties">
      <div>
        <h2>Billed to</h2>
        <p class="party-name">${esc(inv.customer.name)}</p>
      </div>
      <div>
        <h2>From</h2>
        <p class="party-name">${esc(inv.seller.name)}</p>
        ${sellerLines(inv.seller) ? `<p class="party-extra">${sellerLines(inv.seller)}</p>` : ''}
      </div>
    </section>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" class="num">Qty</th>
            <th scope="col" class="num col-unit">Unit price</th>
            <th scope="col" class="num">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="sub"><span>Subtotal</span><span>${money(inv.subtotal)}</span></div>
      <div class="due"><span>Total due</span><span>${money(inv.total)}</span></div>
    </div>

    <p class="thanks">Thank you for your purchase.</p>
  </article>

  <section class="schedule" aria-labelledby="schedule-title">
    <h2 id="schedule-title">Daily email</h2>
    <p>This invoice is emailed to <strong>${esc(status.recipient)}</strong> every day at <span class="nowrap">${esc(sendTimeLabel())}</span> (${esc(TIMEZONE)} time).</p>
    <dl class="facts">
      <div><dt>Next email</dt><dd>${status.live ? '<span class="live-dot" aria-hidden="true"></span>' : ''}${esc(status.nextSend)}</dd></div>
      <div><dt>Last sent</dt><dd id="last-sent">${esc(status.lastSent)}</dd></div>
    </dl>
    ${previewNotice}
    <div class="actions">
      <button type="button" id="send-now">Send test email</button>
      <a href="/email-preview">View the email version</a>
    </div>
    <p id="send-result" role="status" aria-live="polite"></p>
  </section>
</main>

<script>
  const button = document.getElementById('send-now');
  const result = document.getElementById('send-result');
  button.addEventListener('click', async () => {
    button.disabled = true;
    result.textContent = 'Sending test email…';
    try {
      const res = await fetch('/api/send-now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The test email wasn’t sent. Check the server log for details.');
      result.textContent = data.message;
      document.getElementById('last-sent').textContent = data.lastSent;
    } catch (err) {
      result.textContent = err.message;
    } finally {
      setTimeout(() => { button.disabled = false; }, 1500);
    }
  });
</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------- email */
// Table layout and inline styles so it renders in Gmail, Outlook and phones.

function renderEmail(inv) {
  const font = "'Segoe UI', Helvetica, Arial, sans-serif";
  const rows = inv.lines
    .map(
      (l) => `
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #E2E5EB;">
              <div style="font-weight:600;color:#1B2130;font-size:16px;">${esc(l.name)}</div>
              <div style="color:#5D6577;font-size:14px;">${esc(l.description)}</div>
            </td>
            <td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid #E2E5EB;color:#1B2130;font-size:15px;">${l.qty}</td>
            <td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid #E2E5EB;color:#1B2130;font-size:15px;">${money(l.total)}</td>
          </tr>`
    )
    .join('');

  const extra = sellerLines(inv.seller);

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invoice ${esc(inv.number)}</title></head>
<body style="margin:0;padding:0;background:#EEF0F4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F4;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E2E5EB;border-radius:16px;font-family:${font};color:#1B2130;">
      <tr><td style="padding:32px 32px 0;">
        <div style="font-size:30px;font-weight:700;line-height:1.1;">Invoice</div>
        <div style="color:#5D6577;font-size:15px;margin-top:8px;">Number <strong style="color:#1B2130;">${esc(inv.number)}</strong></div>
        <div style="color:#5D6577;font-size:15px;">Issued <strong style="color:#1B2130;">${esc(inv.issued)}</strong></div>
        <div style="color:#5D6577;font-size:15px;">Due on receipt</div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2E5EB;">
          <tr>
            <td valign="top" width="50%" style="padding-top:16px;">
              <div style="color:#5D6577;font-size:13px;">Billed to</div>
              <div style="font-weight:600;font-size:16px;">${esc(inv.customer.name)}</div>
            </td>
            <td valign="top" width="50%" style="padding-top:16px;">
              <div style="color:#5D6577;font-size:13px;">From</div>
              <div style="font-weight:600;font-size:16px;">${esc(inv.seller.name)}</div>
              ${extra ? `<div style="color:#5D6577;font-size:14px;">${extra}</div>` : ''}
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#5D6577;font-size:13px;padding-bottom:8px;border-bottom:1px solid #E2E5EB;">Item</td>
            <td align="right" style="color:#5D6577;font-size:13px;padding:0 0 8px 12px;border-bottom:1px solid #E2E5EB;">Qty</td>
            <td align="right" style="color:#5D6577;font-size:13px;padding:0 0 8px 12px;border-bottom:1px solid #E2E5EB;">Amount</td>
          </tr>${rows}
        </table>
      </td></tr>
      <tr><td style="padding:20px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#5D6577;font-size:15px;">Total due</td>
            <td align="right" style="font-size:28px;font-weight:700;color:#1B2130;">${money(inv.total)}</td>
          </tr>
        </table>
        <div style="color:#5D6577;font-size:14px;margin-top:24px;">Thank you for your purchase.</div>
      </td></tr>
    </table>
    <div style="font-family:${font};color:#8A92A3;font-size:12px;margin-top:16px;">Sent automatically every day at ${esc(sendTimeLabel())} (${esc(TIMEZONE)} time).</div>
  </td></tr>
</table>
</body>
</html>`;
}

function renderText(inv) {
  const lines = inv.lines.map((l) => `- ${l.name} (${l.description}) x${l.qty}: ${money(l.total)}`).join('\n');
  return [
    `Invoice ${inv.number}`,
    `Issued ${inv.issued}. Due on receipt.`,
    '',
    `Billed to: ${inv.customer.name}`,
    `From: ${inv.seller.name}`,
    '',
    lines,
    '',
    `Total due: ${money(inv.total)}`,
    '',
    'Thank you for your purchase.',
  ].join('\n');
}

module.exports = { renderPage, renderEmail, renderText };
