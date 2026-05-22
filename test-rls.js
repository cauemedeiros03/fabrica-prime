import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const url = `${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}`;
    console.log('Fetching OpenAPI spec from:', url);
    const res = await fetch(url);
    const json = await res.json();
    
    console.log('Tables/Views:', Object.keys(json.paths).filter(p => !p.startsWith('/rpc/')));
    console.log('RPCs:', Object.keys(json.paths).filter(p => p.startsWith('/rpc/')));
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
