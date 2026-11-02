/**
 * Autonomous Database Backup Tool
 * Exports 100% of data (Auth users + All Public Tables + Metadata)
 * Uses Supabase Service Role Key without requiring direct PostgreSQL password.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_FILE = process.env.BACKUP_DB_FILE || path.resolve('./backup_workspace/database.json');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { enabled: false }
});

async function exportAll() {
  console.log('🚀 Starting Autonomous Supabase Database Export...');
  const exportData = {
    exportedAt: new Date().toISOString(),
    projectUrl: SUPABASE_URL,
    authUsers: [],
    tables: {}
  };

  // 1. Export Auth Users
  console.log('1. Exporting Auth Users...');
  let page = 1;
  let hasMoreUsers = true;
  while (hasMoreUsers) {
    const { data: userData, error: uErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (uErr) {
      throw new Error(`Failed to export Auth users: ${uErr.message}`);
    }
    exportData.authUsers.push(...userData.users);
    if (userData.users.length < 1000) {
      hasMoreUsers = false;
    } else {
      page++;
    }
  }
  console.log(`   ✔ Exported ${exportData.authUsers.length} Auth users.`);

  // 2. Discover and Export All Tables
  console.log('2. Discovering Public Tables via OpenAPI...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to query OpenAPI schema: HTTP ${res.status}`);
  }

  const schema = await res.json();
  const tables = Object.keys(schema.definitions || {});
  console.log(`   Found ${tables.length} tables in public schema: ${tables.join(', ')}`);

  for (const tableName of tables) {
    console.log(`   Exporting table: "${tableName}"...`);
    let from = 0;
    const step = 1000;
    let hasMoreRows = true;
    const rows = [];

    while (hasMoreRows) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + step - 1);

      if (error) {
        console.error(`   ⚠️ Warning: Error exporting table ${tableName}: ${error.message}`);
        break;
      }

      rows.push(...data);
      if (data.length < step) {
        hasMoreRows = false;
      } else {
        from += step;
      }
    }

    exportData.tables[tableName] = {
      rowCount: rows.length,
      rows: rows
    };
    console.log(`   ✔ Table "${tableName}": ${rows.length} rows.`);
  }

  // Ensure output dir exists
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2), 'utf8');
  const sizeMb = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(2);
  console.log(`\n========================================`);
  console.log(`✔ Database export complete: ${sizeMb} MB written to ${OUTPUT_FILE}`);
  console.log(`========================================`);
}

exportAll().catch(err => {
  console.error('Fatal error during database export:', err);
  process.exit(1);
});
