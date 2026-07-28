const { createClient } = require('@supabase/supabase-js');
const client = createClient('https://qwjzzlacxafeednmsfhv.supabase.co', 'sb_publishable_1hDOqjRFA9AEIcipgf4jVw_jsm3uIUA');

async function inspectColumns() {
  const tables = ['taches', 'seances_pomodoro', 'preferences_utilisateur', 'prereglages', 'sessions_notes'];
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t} error:`, error);
    } else {
      console.log(`Table ${t} sample row keys:`, data.length > 0 ? Object.keys(data[0]) : 'empty table');
    }
  }
}

inspectColumns();
