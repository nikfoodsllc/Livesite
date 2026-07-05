#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env in Livesite. Add STRIPE_SECRET_KEY before running stripe:listen."
  exit 1
fi

STRIPE_SECRET_KEY="$(grep -E '^STRIPE_SECRET_KEY=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")"

if [[ -z "${STRIPE_SECRET_KEY}" ]]; then
  echo "STRIPE_SECRET_KEY is not set in .env"
  exit 1
fi

export STRIPE_API_KEY="${STRIPE_SECRET_KEY}"

echo "Forwarding Stripe webhooks to http://localhost:3000/api/webhooks/stripe"
echo "Copy the whsec_... secret below into STRIPE_WEBHOOK_SECRET in .env, then restart npm run dev."
echo

exec stripe listen \
  --forward-to localhost:3000/api/webhooks/stripe \
  --events payment_intent.succeeded,payment_intent.payment_failed,charge.succeeded,charge.refunded
