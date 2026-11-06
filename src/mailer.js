const nodemailer = require('nodemailer');
const { money } = require('./invoice');
const { renderEmail, renderText } = require('./templates');

const {
  SMTP_HOST,
  SMTP_PORT = '465',
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_TO,
} = process.env;

// Live mode needs at least a server and a recipient; otherwise emails are logged.
const live = Boolean(SMTP_HOST && MAIL_TO);
const port = Number(SMTP_PORT);

const transporter = live
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

function maskEmail(address) {
  const [user, domain] = String(address).trim().split('@');
  if (!domain) return address;
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

function recipientLabel() {
  if (!MAIL_TO) return 'the address you set in MAIL_TO';
  return MAIL_TO.split(',').map(maskEmail).join(', ');
}

async function verify() {
  if (!live) return { ok: false, reason: 'preview' };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function sendInvoiceEmail(invoice) {
  const message = {
    from: MAIL_FROM || SMTP_USER || 'invoices@example.com',
    to: MAIL_TO || 'preview@example.com',
    subject: `Invoice ${invoice.number}: ${invoice.lines[0].name}, ${money(invoice.total)}`,
    text: renderText(invoice),
    html: renderEmail(invoice),
  };

  const info = await transporter.sendMail(message);

  if (!live) {
    console.log(`[preview] Would email "${message.subject}" to ${message.to}. Add SMTP settings to .env to send it for real.`);
  }
  return info;
}

module.exports = { live, sendInvoiceEmail, recipientLabel, verify };
