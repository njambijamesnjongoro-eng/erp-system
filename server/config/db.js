const { Pool } = require('pg');
const { getPoolConfig } = require('./poolConfig');

const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };
