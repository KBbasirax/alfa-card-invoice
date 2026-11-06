// Remembers when the last email went out, so it survives restarts.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'state.json');

let state = { lastSentAt: null, lastInvoice: null, lastTrigger: null, lastError: null };

try {
  state = { ...state, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
} catch {
  // First run: no state file yet.
}

function get() {
  return state;
}

function update(changes) {
  state = { ...state, ...changes };
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn(`Couldn't save state to ${FILE}: ${err.message}`);
  }
  return state;
}

module.exports = { get, update };
