// LalaKirana — Migration Runner
// Run: node run-migrations.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
  const dir = __dirname;
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // runs in numeric order: 001, 002, ...

  console.log(`\nLalaKirana Migration Runner`);
  console.log(`Found ${files.length} migration files\n`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`  Running ${file}... `);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      // Note: exec_sql is a Supabase custom RPC — see alternative below
      if (error) throw error;
      console.log('✓');
    } catch (err) {
      console.log('✗');
      console.error(`  ERROR: ${err.message}`);
      console.error(`  Stopping. Fix the error above and re-run.`);
      process.exit(1);
    }
  }

  console.log(`\n✓ All migrations completed successfully.\n`);
  console.log(`Next steps:`);
  console.log(`  1. Update the bcrypt hash in 016_seed_admin_user.sql`);
  console.log(`  2. Log in at your app with owner@lalakirana.in`);
  console.log(`  3. Change the password immediately from Settings\n`);
}

runMigrations();
// ALTERNATIVE: If exec_sql RPC is not available, paste each .sql file
// directly into Supabase SQL Editor in order (001 → 016).
