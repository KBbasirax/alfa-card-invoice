// Invoice data and helpers. Names come from settings (secrets on GitHub, .env locally);
// edit the items here.

const TIMEZONE = process.env.TIMEZONE || 'Asia/Beirut';
const SEND_HOUR = clampInt(process.env.SEND_HOUR, 0, 23, 9);
const SEND_MINUTE = clampInt(process.env.SEND_MINUTE, 0, 59, 0);

const seller = {
  name: process.env.SELLER_NAME || 'Your Store',
  address: process.env.SELLER_ADDRESS || '',
  phone: process.env.SELLER_PHONE || '',
};

const customer = {
  name: process.env.CUSTOMER_NAME || 'Customer',
};

const items = [
  {
    name: 'Alfa Card',
    description: 'Prepaid mobile recharge card',
    qty: 1,
    unitPrice: 6,
  },
];

const CURRENCY = 'USD';

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

// Date parts (year, month, day, hour, minute) as seen in the invoice timezone.
function partsInTz(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
}

function money(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

// "9:00 AM"
function sendTimeLabel() {
  const h12 = SEND_HOUR % 12 === 0 ? 12 : SEND_HOUR % 12;
  const suffix = SEND_HOUR < 12 ? 'AM' : 'PM';
  return `${h12}:${String(SEND_MINUTE).padStart(2, '0')} ${suffix}`;
}

// "Today at 9:00 AM" or "Tomorrow at 9:00 AM"
function nextSendLabel(now = new Date()) {
  const p = partsInTz(now);
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  const laterToday = hour < SEND_HOUR || (hour === SEND_HOUR && minute < SEND_MINUTE);
  return `${laterToday ? 'Today' : 'Tomorrow'} at ${sendTimeLabel()}`;
}

// One invoice per day: the number and issue date follow the day it's generated.
function buildInvoice(date = new Date()) {
  const p = partsInTz(date);
  const lines = items.map((item) => ({ ...item, total: item.qty * item.unitPrice }));
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  return {
    number: `INV-${p.year}${p.month}${p.day}`,
    issued: formatDate(date),
    seller,
    customer,
    lines,
    subtotal,
    total: subtotal,
    currency: CURRENCY,
  };
}

module.exports = {
  TIMEZONE,
  SEND_HOUR,
  SEND_MINUTE,
  buildInvoice,
  money,
  formatDateTime,
  sendTimeLabel,
  nextSendLabel,
};
