// Sends today's invoice once. Used by the GitHub Actions workflow.
//
// GitHub schedules run in UTC, and Beirut is UTC+3 in summer and UTC+2 in
// winter. The workflow runs at 06:00 and 07:00 UTC, and this script only
// sends on the run that lands on SEND_HOUR in Beirut, so the email goes out
// at 9:00 AM all year without changing anything when the clocks move.

require('dotenv').config();
const { buildInvoice, TIMEZONE, SEND_HOUR } = require('./src/invoice');
const mailer = require('./src/mailer');

function utcOffsetHours(date) {
  const label = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // e.g. "GMT+02:00"
  const m = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const hours = Number(m[2]) + Number(m[3]) / 60;
  return m[1] === '-' ? -hours : hours;
}

const schedule = process.env.SCHEDULE; // the cron line that started this run, e.g. "0 7 * * *"
const force = process.env.FORCE === 'true';

if (schedule && !force) {
  const hourUtc = Number(schedule.trim().split(/\s+/)[1]);
  const localHour = (hourUtc + utcOffsetHours(new Date()) + 24) % 24;
  if (localHour !== SEND_HOUR) {
    console.log(`Skipping: this run is ${localHour}:00 in ${TIMEZONE}. The email goes out on the ${SEND_HOUR}:00 run.`);
    process.exit(0);
  }
}

if (!mailer.live && process.env.GITHUB_ACTIONS) {
  console.error('Email isn’t set up: add the MAIL_TO, MAIL_FROM, SMTP_USER and SMTP_PASS secrets in the repository settings.');
  process.exit(1);
}

const invoice = buildInvoice(new Date());
mailer
  .sendInvoiceEmail(invoice)
  .then(() => console.log(`Invoice ${invoice.number} ${mailer.live ? 'sent' : 'logged (preview mode)'}.`))
  .catch((err) => {
    console.error(`Sending failed: ${err.message}`);
    process.exit(1);
  });
