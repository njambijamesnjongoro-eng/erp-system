const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/erp_system' });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance' ORDER BY ordinal_position")
  .then(r => { console.log(r.rows.map(c => `${c.column_name} (${c.data_type})`).join('\n')); pool.end(); })
  .catch(e => { console.log(e.message); pool.end(); });
