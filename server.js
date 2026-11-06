require('dotenv').config();

const express = require('express');
const cron = require('node-cron');
const {
  TIMEZONE,
  SEND_HOUR,
  SEND_MINUTE,
  buildInvoice,
  formatDateTime,
  sendTimeLabel,
  nextSendLabel,
} = require('./src/invoice');
const { renderPage, renderEmail } = require('./src/templates');
const mailer = require('./src/mailer');
const state = require('./src/state');

const PORT = Number(process.env.PORT) || 3000;
const TEST_COOLDOWN_MS = 60 * 1000;
let lastTestAt = 0;

function lastSentLabel() {
  const { lastSentAt } = state.get();
  return lastSentAt ? formatDateTime(new Date(lastSentAt)) : 'Not sent yet';
}

async function sendInvoice(trigger) {
  const invoice = buildInvoice(new Date());
  try {
    await mailer.sendInvoiceEmail(invoice);
    state.update({
      lastSentAt: new Date().toISOString(),
      lastInvoice: invoice.number,
      lastTrigger: trigger,
      lastError: null,
    });
    console.log(`[${new Date().toISOString()}] ${trigger} email for ${invoice.number} ${mailer.live ? 'sent' : 'logged (preview mode)'}.`);
    return invoice;
  } catch (err) {
    state.update({ lastError: err.message });
    console.error(`[${new Date().toISOString()}] ${trigger} email for ${invoice.number} failed: ${err.message}`);
    throw err;
  }
}

/* ---------------------------------------------------- one-off CLI send */
if (process.argv.includes('--send-now')) {
  sendInvoice('manual')
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
  return;
}

/* -------------------------------------------------------------- server */
const app = express();

app.get('/', (req, res) => {
  const invoice = buildInvoice(new Date());
  res.type('html').send(
    renderPage(invoice, {
      live: mailer.live,
      recipient: mailer.recipientLabel(),
      nextSend: nextSendLabel(),
      lastSent: lastSentLabel(),
    })
  );
});

app.get('/email-preview', (req, res) => {
  res.type('html').send(renderEmail(buildInvoice(new Date())));
});

app.get('/api/status', (req, res) => {
  res.json({
    mode: mailer.live ? 'live' : 'preview',
    schedule: `Every day at ${sendTimeLabel()} (${TIMEZONE})`,
    nextSend: nextSendLabel(),
    ...state.get(),
  });
});

app.post('/api/send-now', async (req, res) => {
  const wait = TEST_COOLDOWN_MS - (Date.now() - lastTestAt);
  if (wait > 0) {
    return res.status(429).json({ error: `A test email was just sent. Try again in ${Math.ceil(wait / 1000)} seconds.` });
  }
  lastTestAt = Date.now();
  try {
    const invoice = await sendInvoice('test');
    res.json({
      message: mailer.live
        ? `Test email for ${invoice.number} sent to ${mailer.recipientLabel()}.`
        : `Preview mode: the test email for ${invoice.number} was written to the server log, not sent.`,
      lastSent: lastSentLabel(),
    });
  } catch (err) {
    lastTestAt = 0;
    res.status(500).json({ error: `The test email wasn’t sent: ${err.message}` });
  }
});

/* ----------------------------------------------------------- scheduler */
cron.schedule(
  `${SEND_MINUTE} ${SEND_HOUR} * * *`,
  () => {
    sendInvoice('daily').catch(() => {});
  },
  { timezone: TIMEZONE }
);

app.listen(PORT, async () => {
  console.log(`Invoice app running at http://localhost:${PORT}`);
  console.log(`Daily email scheduled for ${sendTimeLabel()} (${TIMEZONE}). Next: ${nextSendLabel()}.`);
  const check = await mailer.verify();
  if (check.ok) {
    console.log(`Email is set up. Sending to ${mailer.recipientLabel()}.`);
  } else if (check.reason === 'preview') {
    console.log('Preview mode: SMTP_HOST or MAIL_TO is missing in .env, so emails are logged instead of sent.');
  } else {
    console.warn(`Couldn't connect to the email server: ${check.reason}. Check your SMTP settings in .env.`);
  }
});
