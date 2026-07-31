const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

async function run(label, queries) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`  ${label}...`);
    let count = 0;
    for (const q of queries) {
    try {
      const r = await client.query(q.text, q.params || []);
      if (r.rowCount) count += r.rowCount;
    } catch (e) {
      if (count === 0) console.log(`    First error: ${e.message.slice(0,120)}`);
    }
    }
    await client.query('COMMIT');
    console.log(`  ✓ ${label}: ${count} records`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.log(`  ✗ ${label}: ${e.message}`);
  } finally {
    client.release();
  }
}

function query(sql, params) {
  return { text: sql, params };
}

async function seedSupplement() {
  console.log('Adding supplemental demo data...\n');

  // Reference data
  const ref = await pool.connect();
  let deptIds, empList, users, vendors, assetCats, leaveTypes, integs, defs, frameworks, existingCompanies;
  try {
    const d = await ref.query('SELECT id, name FROM departments');
    deptIds = d.rows.map(r => r.id);
    const u = await ref.query('SELECT id, email FROM users');
    users = u.rows;
    const e = await ref.query('SELECT id, employee_id, full_name FROM employee_profiles');
    empList = e.rows;
    const v = await ref.query('SELECT id, vendor_name FROM vendors LIMIT 5');
    vendors = v.rows;
    const ac = await ref.query('SELECT id, category_name FROM asset_categories');
    assetCats = ac.rows;
    const lt = await ref.query('SELECT id, name FROM leave_types');
    leaveTypes = lt.rows;
    const ig = await ref.query('SELECT id, name FROM integrations LIMIT 3');
    integs = ig.rows;
    const wd = await ref.query('SELECT id, name FROM workflow_definitions LIMIT 2');
    defs = wd.rows;
    const fw = await ref.query('SELECT id, name FROM compliance_frameworks LIMIT 2');
    frameworks = fw.rows;
    const ec = await ref.query('SELECT id FROM companies');
    existingCompanies = ec.rows;
  } finally {
    ref.release();
  }

  if (empList.length === 0) {
    console.log('No employees found - core seed may not have run. Skipping.');
    return;
  }

  console.log(`  Reference: ${deptIds.length} departments, ${empList.length} employees, ${vendors.length} vendors\n`);

  // ── 1. ATTENDANCE ──
  const attQueries = [];
  const statuses = ['present','present','present','present','late','absent'];
  for (const emp of empList.slice(0, 8)) {
    for (let d = 1; d <= 30; d++) {
      const date = new Date(2026, 4, d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const ci = new Date(date); ci.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
      let co = null;
      if (st !== 'absent') { co = new Date(date); co.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60)); }
      attQueries.push(query(
        `INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, work_hours)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (employee_id, date) DO NOTHING`,
        [emp.id, date, ci, co, st, co ? parseFloat(((co - ci) / 3600000).toFixed(2)) : 0]
      ));
    }
  }
  await run('Attendance', attQueries);

  // ── 2. LEAVE ──
  if (leaveTypes.length > 0) {
    const lq = [];
    for (let i = 0; i < 5 && i < empList.length; i++) {
      const start = new Date(2026, 5, 10 + i * 7);
      const end = new Date(start); end.setDate(end.getDate() + 2 + Math.floor(Math.random() * 3));
      lq.push(query(
        `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status, total_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [empList[i].id, leaveTypes[i % leaveTypes.length].id, start, end,
         'Annual leave request', ['pending','approved','approved','rejected'][i % 4],
         Math.ceil((end - start) / 86400000) + 1]
      ));
    }
    await run('Leave Requests', lq);
  }

  // ── 3. PAYROLL ──
  const pq = [];
  const periods = [
    {p:'2026-04',pd:'2026-04-25'},{p:'2026-05',pd:'2026-05-25'}
  ];
  for (const pm of periods) {
    for (const emp of empList.slice(0, 8)) {
      const basic = 50000 + Math.floor(Math.random() * 150000);
      const allow = basic * 0.2;
      const gross = basic + allow;
      const tax = gross * 0.15;
      const sha = gross * 0.0275;
      const ded = tax + sha + 2000;
      pq.push(query(
        `INSERT INTO payroll_records (employee_id, pay_period, basic_salary, allowances, gross_pay, tax_deduction, sha_deduction, other_deductions, total_deductions, net_pay, payment_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'paid') ON CONFLICT DO NOTHING`,
        [emp.id, pm.p, basic, allow, gross, tax, sha, 2000, ded, gross - ded, pm.pd]
      ));
    }
  }
  await run('Payroll Records', pq);

  // ── 4. BUDGETS ──
  const bq = [];
  for (let i = 0; i < 5; i++) {
    bq.push(query(
      `INSERT INTO budgets (fiscal_year, budget_name, department_id, total_amount, spent_amount, status)
       VALUES (2026,$1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [['Annual Operating','IT Infrastructure','Marketing','HR Development','R&D'][i],
       deptIds[i % deptIds.length], 500000 + Math.floor(Math.random() * 2000000),
       Math.floor(Math.random() * 300000), ['active','active','draft'][i % 3]]
    ));
  }
  await run('Budgets', bq);

  // ── 5. ASSETS ──
  if (vendors.length > 0 && assetCats.length > 0) {
    const aq = [];
    const names = ['Dell Latitude 5540','HP LaserJet Pro','Ford Ranger 2024','Server Rack UPS','Conference Room Projector',
      'MacBook Pro M3','Cisco Switch 48 Port','Toyota HiAce Van','Air Conditioner LG','Security Camera System'];
    for (let i = 0; i < names.length; i++) {
      aq.push(query(
        `INSERT INTO assets (asset_code, asset_name, category_id, vendor_id, purchase_date, purchase_cost, current_value, status, location, department_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [`AST-${2026001 + i}`, names[i], assetCats[i % assetCats.length].id,
         vendors[i % vendors.length].id, '2026-01-15', 50000 + Math.floor(Math.random() * 500000),
         40000 + Math.floor(Math.random() * 400000), ['in_use','in_use','available','under_maintenance'][i % 4],
         'Nairobi HQ', deptIds[i % deptIds.length]]
      ));
    }
    await run('Assets', aq);
  }

  // ── 6. FLEET ──
  const fq = [
    query(`INSERT INTO fleet_vehicles (plate_number, vehicle_model, fuel_type, status, department_id)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, ['KCA 001A','Toyota Prado','Diesel','active',deptIds[0]]),
    query(`INSERT INTO fleet_vehicles (plate_number, vehicle_model, fuel_type, status, department_id)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, ['KCA 002B','Toyota Hilux','Diesel','active',deptIds[0]]),
    query(`INSERT INTO fleet_vehicles (plate_number, vehicle_model, fuel_type, status, department_id)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, ['KCA 003C','Ford Ranger','Diesel','active',deptIds[0]]),
  ];
  await run('Fleet', fq);

  // ── 7. PURCHASE ORDERS ──
  if (vendors.length > 0) {
    const poq = [];
    for (let i = 0; i < 3; i++) {
      poq.push(query(
        `INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_delivery_date, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [`PO-2026-${1001 + i}`, vendors[i].id, '2026-05-01', '2026-05-30', ['draft','sent','approved'][i], empList[0]?.id]
      ));
    }
    await run('Purchase Orders', poq);
  }

  // ── 8. TICKETS ──
  const tq = [];
  for (let i = 0; i < 5; i++) {
    tq.push(query(
      `INSERT INTO support_tickets (subject, description, status, priority, created_by, department_id)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [['Password reset request','New software installation','VPN access issue','Printer not working','Email configuration help'][i],
       `Sample ticket #${i + 1}`,
       ['open','in_progress','resolved','closed'][i % 4],
       ['medium','low','high','medium','low'][i],
       empList[i % empList.length]?.id, deptIds[i % deptIds.length]]
    ));
  }
  await run('Support Tickets', tq);

  // ── 9. ANNOUNCEMENTS ──
  await run('Announcements', [
    query(`INSERT INTO announcements (title, content, created_by, target_audience, is_published)
           VALUES ('Company All-Hands Meeting','Monthly all-hands meeting Friday 10 AM.',$1,'all',true)`, [users[0]?.id]),
    query(`INSERT INTO announcements (title, content, created_by, target_audience, is_published)
           VALUES ('New HR Policy Update','Please review the updated leave policy document.',$1,'all',true)`, [users[0]?.id]),
  ]);

  // ── 10. CALENDAR EVENTS ──
  await run('Calendar Events', [
    query(`INSERT INTO calendar_events (title, description, start_time, end_time, created_by)
           VALUES ('Board Meeting','Scheduled','2026-06-15 09:00','2026-06-15 17:00',$1)`, [users[0]?.id]),
    query(`INSERT INTO calendar_events (title, description, start_time, end_time, created_by)
           VALUES ('Training Workshop','Scheduled','2026-06-20 09:00','2026-06-20 17:00',$1)`, [users[0]?.id]),
    query(`INSERT INTO calendar_events (title, description, start_time, end_time, created_by)
           VALUES ('Project Deadline','Scheduled','2026-06-30 09:00','2026-06-30 17:00',$1)`, [users[0]?.id]),
  ]);

  // ── 11. PAYMENTS ──
  const payq = [];
  for (let i = 0; i < 5; i++) {
    payq.push(query(
      `INSERT INTO payment_transactions (transaction_id, amount, currency, provider, status, payment_type, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [`TXN-DEMO-${1001 + i}`, 1000 + Math.floor(Math.random() * 99000), 'KES',
       ['mpesa','bank_transfer','card'][i % 3], ['completed','completed','pending','failed'][i % 4],
       ['invoice','deposit','subscription'][i % 3], `Demo payment #${i + 1}`]
    ));
  }
  await run('Payment Transactions', payq);

  // ── 12. ENTERPRISE ──
  if (existingCompanies.length <= 1) {
    await run('Enterprise Company', [
      query(`INSERT INTO companies (company_code, company_name, tax_id, email, phone, country, is_active, subscription_plan)
             VALUES ('EKE002','Enterprise Kenya Ltd','P051234567Z','info@enterprise-ke.com','+254722100200','Kenya',true,'enterprise')
             ON CONFLICT (company_code) DO NOTHING`),
    ]);
  }

  // ── 13. RISKS ──
  await run('Risk Assessments', [
    query(`INSERT INTO risk_assessments (title, risk_type, risk_level, status, department_id, identified_by, mitigation_plan)
           VALUES ('Data breach risk assessment','operational','high','identified',$1,$2,'Implement controls')`,
          [deptIds[0], empList[0]?.id]),
    query(`INSERT INTO risk_assessments (title, risk_type, risk_level, status, department_id, identified_by, mitigation_plan)
           VALUES ('Supplier dependency analysis','strategic','medium','assessed',$1,$2,'Diversify suppliers')`,
          [deptIds[1], empList[0]?.id]),
    query(`INSERT INTO risk_assessments (title, risk_type, risk_level, status, department_id, identified_by, mitigation_plan)
           VALUES ('Regulatory compliance review','compliance','low','mitigated',$1,$2,'Annual audits')`,
          [deptIds[2], empList[0]?.id]),
  ]);

  // ── 14. POLICIES ──
  await run('Policies', [
    query(`INSERT INTO policies (title, content, status, version, created_by)
           VALUES ('Employee Code of Conduct','Professional conduct standards.','published',1,$1)`, [users[0]?.id]),
    query(`INSERT INTO policies (title, content, status, version, created_by)
           VALUES ('IT Security Policy','Password every 90 days. MFA required.','published',1,$1)`, [users[0]?.id]),
    query(`INSERT INTO policies (title, content, status, version, created_by)
           VALUES ('Leave Policy 2026','Annual: 21 days. Sick: 14 days.','published',1,$1)`, [users[0]?.id]),
  ]);

  // ── 15. AI ANALYTICS ──
  const aiq = [];
  for (let i = 0; i < 5; i++) {
    aiq.push(query(
      `INSERT INTO ai_analytics (analysis_type, title, description, status, result_summary, created_by)
       VALUES ($1,$2,'Automated analysis','completed',$3,$4) ON CONFLICT DO NOTHING`,
      [['anomaly','insight','prediction'][i % 3], `Analysis #${i + 1}`,
       JSON.stringify({ confidence: 0.85 + Math.random() * 0.1, impact: 'medium' }), users[0]?.id]
    ));
  }
  await run('AI Analytics', aiq);

  // ── 16. FORECASTS ──
  const fcq = [];
  for (let i = 0; i < 6; i++) {
    const fd = new Date(2026, 4 + i, 1);
    fcq.push(query(
      `INSERT INTO forecast_records (forecast_type, period_start, period_end, predicted_value, confidence, status, department_id)
       VALUES ($1,$2,$3,$4,$5,'active',$6) ON CONFLICT DO NOTHING`,
      [['revenue','expense','headcount'][i % 3], fd.toISOString().split('T')[0],
       new Date(fd.getFullYear(), fd.getMonth() + 1, 0).toISOString().split('T')[0],
       500000 + Math.floor(Math.random() * 2000000), 0.75 + Math.random() * 0.2, deptIds[i % deptIds.length]]
    ));
  }
  await run('Forecast Records', fcq);

  // ── 17. INTEGRATION LOGS ──
  if (integs.length > 0) {
    const ilq = [];
    for (const integ of integs) {
      for (let i = 0; i < 3; i++) {
        ilq.push(query(
          `INSERT INTO integration_logs (integration_id, status, message, response_code)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [integ.id, Math.random() > 0.3 ? 'success' : 'error',
           `${integ.name} ${Math.random() > 0.3 ? 'sync completed' : 'sync failed'}`,
           Math.random() > 0.3 ? 200 : 500]
        ));
      }
    }
    await run('Integration Logs', ilq);
  }

  // ── 18. AUDIT LOG ──
  await run('Audit Log', [
    query(`INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
           VALUES ('user',$1,'login',$2,'User logged in')`, [empList[0]?.id, users[0]?.id]),
    query(`INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
           VALUES ('leave',$1,'approved',$2,'Leave approved')`, [empList[0]?.id, users[0]?.id]),
    query(`INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
           VALUES ('purchase_order',$1,'created',$2,'PO created')`, [empList[0]?.id, users[0]?.id]),
  ]);

  // ── 19. WORKFLOW INSTANCES ──
  if (defs.length > 0) {
    const wiq = [];
    for (const def of defs) {
      wiq.push(query(
        `INSERT INTO workflow_instances (workflow_definition_id, entity_type, entity_id, status, current_step, initiated_by)
         VALUES ($1,'demo','00000000-0000-0000-0000-000000000001','in_progress',1,$2) ON CONFLICT DO NOTHING`,
        [def.id, empList[0]?.id]
      ));
    }
    await run('Workflow Instances', wiq);
  }

  // ── 20. COMPLIANCE AUDITS ──
  if (frameworks.length > 0) {
    const caq = [];
    for (const fw of frameworks) {
      caq.push(query(
        `INSERT INTO compliance_audits (framework_id, audit_date, auditor_id, status, findings, score)
         VALUES ($1,'2026-05-15',$2,$3,'Audit completed',$4) ON CONFLICT DO NOTHING`,
        [fw.id, empList[0]?.id, Math.random() > 0.5 ? 'passed' : 'findings', Math.floor(70 + Math.random() * 30)]
      ));
    }
    await run('Compliance Audits', caq);
  }

  console.log('\n═══ SUPPLEMENTAL SEED COMPLETE ═══');
  pool.end();
}

seedSupplement().catch(e => { console.error(e); pool.end(); });
