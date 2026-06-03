const { pool } = require('../config/db');

const getOverview = async (req, res, next) => {
  try {
    const totalEmployees = await pool.query(
      `SELECT COUNT(*) FROM employee_profiles WHERE employment_status != 'terminated'`);
    const activeEmployees = await pool.query(
      `SELECT COUNT(*) FROM employee_profiles WHERE employment_status = 'active'`);
    const departmentCount = await pool.query(
      `SELECT COUNT(*) FROM departments WHERE is_active = true`);
    const pendingLeaveCount = await pool.query(
      `SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'`);

    const employeesByDept = await pool.query(
      `SELECT d.id, d.name, d.code, COUNT(ep.id) as employee_count
       FROM departments d LEFT JOIN employee_profiles ep ON ep.department_id = d.id AND ep.employment_status = 'active'
       GROUP BY d.id, d.name, d.code ORDER BY d.name`);

    const presentToday = await pool.query(
      `SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND clock_in IS NOT NULL AND clock_out IS NULL`);

    const absentToday = await pool.query(
      `SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND status = 'absent'`);

    const contractExpiring = await pool.query(
      `SELECT ep.id, ep.full_name, ep.employee_id, ep.contract_end_date, ep.position, d.name as department_name
       FROM employee_profiles ep LEFT JOIN departments d ON ep.department_id = d.id
       WHERE ep.employment_status = 'active' AND ep.contract_end_date IS NOT NULL
         AND ep.contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY ep.contract_end_date`);

    const insuranceExpiring = await pool.query(
      `SELECT ei.id, ei.insurance_type, ei.provider, ei.policy_number, ei.coverage_end_date,
              ep.full_name, ep.employee_id
       FROM employee_insurance ei JOIN employee_profiles ep ON ei.employee_id = ep.id
       WHERE ei.status = 'active' AND ei.coverage_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY ei.coverage_end_date`);

    const trainingCompliance = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN et.status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN et.status = 'enrolled' THEN 1 ELSE 0 END) as in_progress,
              SUM(CASE WHEN et.status = 'expired' THEN 1 ELSE 0 END) as expired
       FROM employee_training et`);

    const leaveStats = await pool.query(
      `SELECT lt.name, lt.code, COUNT(lr.id) as total_requests,
              SUM(CASE WHEN lr.status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN lr.status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN lr.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
              COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as total_days_taken
       FROM leave_types lt
       LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id AND EXTRACT(YEAR FROM lr.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
       GROUP BY lt.id, lt.name, lt.code`);

    const recentHires = await pool.query(
      `SELECT ep.id, ep.full_name, ep.employee_id, ep.position, ep.date_hired, d.name as department_name
       FROM employee_profiles ep LEFT JOIN departments d ON ep.department_id = d.id
       WHERE ep.employment_status = 'active'
       ORDER BY ep.date_hired DESC LIMIT 5`);

    res.json({
      success: true,
      data: {
        totals: {
          employees: parseInt(totalEmployees.rows[0].count),
          active: parseInt(activeEmployees.rows[0].count),
          departments: parseInt(departmentCount.rows[0].count),
          pendingLeaves: parseInt(pendingLeaveCount.rows[0].count),
        },
        attendance: {
          presentToday: parseInt(presentToday.rows[0].count),
          absentToday: parseInt(absentToday.rows[0].count),
        },
        employeesByDepartment: employeesByDept.rows,
        contractExpiring: contractExpiring.rows,
        insuranceExpiring: insuranceExpiring.rows,
        trainingCompliance: trainingCompliance.rows[0],
        leaveStats: leaveStats.rows,
        recentHires: recentHires.rows,
      }
    });
  } catch (err) { next(err); }
};

module.exports = { getOverview };
