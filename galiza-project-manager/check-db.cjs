const SUPABASE_URL = 'https://dgqmnzkauhpkpzhrnwlb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA0MTUsImV4cCI6MjA5MTczNjQxNX0.70a3IAwNlHJOnpKrzfsafDUNjtNfnPyScjKBkiQrpJE';

async function checkTable(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`Table [${table}] EXISTS. Row count/sample keys:`, Object.keys(data[0] || {}));
    } else {
      console.log(`Table [${table}] does NOT exist or returns error:`, res.status, await res.text());
    }
  } catch (err) {
    console.error(`Error checking [${table}]:`, err.message);
  }
}

async function run() {
  await checkTable('kpis');
  await checkTable('global_kpi_params');
  await checkTable('kpi_collections');
  await checkTable('tasks');
}

run();
