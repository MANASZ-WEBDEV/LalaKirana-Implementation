# LalaKirana — Database Migrations

## How to Run

### Option A: Supabase Dashboard (Recommended for first setup)
1. Open your Supabase project → SQL Editor
2. Paste and run each file IN ORDER: 001 → 016
3. Check for errors after each file before moving to the next

### Option B: Run via Node.js script
```bash
npm install @supabase/supabase-js dotenv
node run-migrations.js
```

### Option C: psql direct (if you have the connection string)
```bash
for f in $(ls *.sql | sort); do
  echo "Running $f..."
  psql "$DATABASE_URL" -f "$f"
done
```

## Files
| File | Creates | Notes |
|------|---------|-------|
| 001 | users | + locked_until for login lockout |
| 002 | categories | — |
| 003 | products | + price_updated_at for stale-price badge |
| 004 | stock_log | Immutable audit trail |
| 005 | customers | + is_trusted, wallet_balance |
| 006 | bills | + bill_number sequence + generate function |
| 007 | bill_items | Price + name snapshot columns |
| 008 | khata_entries | Soft-delete only |
| 009 | wallet_entries | Phase 3+ |
| 010 | price_history | + trigger on products.price UPDATE |
| 011 | eod_entries | Unique constraint: 1 per product per day |
| 012 | token_blocklist | + cleanup function |
| 013 | sessions | — |
| 014 | otp_requests | + cleanup function |
| 015 | — | Seeds 8 categories |
| 016 | — | Seeds first owner account |

## After Running
1. Go to migration 016 — replace the bcrypt hash placeholder with a real hash
2. Log in with owner@lalakirana.in and change the password immediately
3. Create staff accounts from Settings
4. Schedule nightly cleanup (token_blocklist + otp_requests):
   - In Supabase: use pg_cron extension
   - Or: set a daily Railway cron job calling POST /admin/cleanup
