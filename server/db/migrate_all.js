const { spawnSync } = require('child_process');

const migrations = [
  'migrate.js',
  'migrate_security.js',
  'migrate_security_phase2.js',
  'migrate_security_phase3.js',
  'migrate_security_phase4.js',
  'migrate_security_phase5.js',
  'migrate_security_phase6.js',
  'migrate_security_phase7.js',
  'migrate_security_phase8.js',
  'migrate_security_phase9.js',
  'migrate_admin.js',
  'migrate_finance.js',
  'migrate_assets.js',
  'migrate_procurement.js',
  'migrate_analytics.js',
  'migrate_portal.js',
  'migrate_enterprise.js',
  'seed_module_permissions.js',
];

for (const migration of migrations) {
  const result = spawnSync(process.execPath, [`db/${migration}`], {
    cwd: require('path').join(__dirname, '..'),
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
