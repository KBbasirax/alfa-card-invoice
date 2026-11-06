# Alfa Card invoice

Emails an Alfa Card invoice ($6.00) every day at 9:00 AM Beirut time using GitHub Actions, with no server to run. It can also show the invoice as a web page on your computer.

## How the daily email works

`.github/workflows/daily-invoice.yml` runs at 06:00 and 07:00 UTC. Beirut is UTC+3 in summer and UTC+2 in winter, so `send.js` only sends on the run that lands on 9:00 AM in Beirut. The email goes out at 9:00 all year without any changes when the clocks move.

Public repositories have their schedules switched off after 60 days without activity. A small keepalive job re-enables the workflow on every scheduled run to prevent that.

## Setup

Add these under **Settings > Secrets and variables > Actions > New repository secret**:

| Secret | What it is |
| --- | --- |
| `MAIL_TO` | Who receives the invoice |
| `MAIL_FROM` | Sender shown in the inbox, like `Your Name <you@gmail.com>` |
| `SMTP_USER` | The Gmail address that sends it |
| `SMTP_PASS` | A Gmail App Password for that address (Google Account > Security > 2-Step Verification > App passwords) |
| `CUSTOMER_NAME` | Name in the invoice's "Billed to" section |
| `SELLER_NAME` | Name in the invoice's "From" section |

Secrets stay hidden even though the repository is public, and they're masked in the run logs.

To test, open the **Actions** tab, choose **Daily invoice email** and click **Run workflow**. GitHub sometimes starts scheduled runs a few minutes late, so the email may land shortly after 9:00.

## Run it on your computer

1. Install Node.js 18 or newer and run `npm install`.
2. Copy `.env.example` to `.env` and fill it in.
3. Run `npm start` and open http://localhost:3000.

Without SMTP settings the app runs in preview mode: emails are printed to the terminal instead of sent. http://localhost:3000/email-preview shows exactly what the email looks like.

## Changing things

- Items and prices: `src/invoice.js`.
- Each day's invoice gets its own number based on the date, like `INV-20261106`.
