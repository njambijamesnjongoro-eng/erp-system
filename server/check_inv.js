const { Pool } = require('pg');
const p = new Pool({ database:'erp_system', user:'postgres', password:'postgres' });
p.query("SELECT column_name FROM information_schema.columns WHERE table_name='invoices' ORDER BY ordinal_position")
  .then(r => { console.log(r.rows.map(r => r.column_name).join('\n')); p.end(); }).catch(e => { console.error(e.message); p.end(); });
