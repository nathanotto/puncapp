#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Get query from command line or file
const args = process.argv.slice(2);
let query = '';

if (args[0] === '-f' && args[1]) {
  // Read from file
  query = fs.readFileSync(args[1], 'utf8');
} else if (args[0] === '-c' && args[1]) {
  // Direct query
  query = args[1];
} else {
  console.error('Usage: node run-query.js -c "SELECT * FROM users" OR -f query.sql');
  process.exit(1);
}

// Load env vars
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query });

    if (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
