const db = require('../config/db');

class PayrollEngine {
  static async calculateGrossPay(salaryStructure, { overtimeHours = 0, overtimeRate = 0, bonus = 0 } = {}) {
    const base = parseFloat(salaryStructure.basic_salary) || 0;
    const housing = parseFloat(salaryStructure.housing_allowance) || 0;
    const transport = parseFloat(salaryStructure.transport_allowance) || 0;
    const medical = parseFloat(salaryStructure.medical_allowance) || 0;
    const leaveAllow = parseFloat(salaryStructure.leave_allowance) || 0;
    const otherAllow = parseFloat(salaryStructure.other_allowances) || 0;
    const overtimePay = overtimeHours * overtimeRate;

    return {
      basic_salary: base,
      housing_allowance: housing,
      transport_allowance: transport,
      medical_allowance: medical,
      leave_allowance: leaveAllow,
      bonus: parseFloat(bonus) || 0,
      overtime_pay: overtimePay,
      other_allowances: otherAllow,
      gross_pay: base + housing + transport + medical + leaveAllow + (parseFloat(bonus) || 0) + overtimePay + otherAllow,
    };
  }

  static async calculateDeductions(grossPay, loanDeduction = 0, insuranceDeduction = 0) {
    const taxEngine = require('./taxEngine');
    const payeTax = taxEngine.calculatePAYE(grossPay);
    const sha = taxEngine.calculateSHA(grossPay);
    const loan = parseFloat(loanDeduction) || 0;
    const insurance = parseFloat(insuranceDeduction) || 0;

    const totalDeductions = payeTax + sha + loan + insurance;

    return {
      sha_deduction: sha,
      paye_tax: payeTax,
      loan_deduction: loan,
      insurance_deduction: insurance,
      other_deductions: 0,
      total_deductions: totalDeductions,
      net_pay: grossPay - totalDeductions,
    };
  }

  static async getEmployeeSalaryStructure(employeeId) {
    const result = await db.query(
      `SELECT * FROM salary_structures WHERE employee_id = $1 AND (status = 'active' OR status = 'approved') ORDER BY effective_from DESC LIMIT 1`,
      [employeeId]
    );
    return result.rows[0] || null;
  }

  static async processPayroll(payrollPeriodId) {
    const period = await db.query('SELECT * FROM payroll_periods WHERE id = $1', [payrollPeriodId]);
    if (!period.rows[0]) throw new Error('Payroll period not found');
    if (period.rows[0].status !== 'draft') throw new Error('Payroll period is not in draft status');

    const employees = await db.query(`
      SELECT ep.id, ep.employee_id, u.email 
      FROM employee_profiles ep 
      JOIN users u ON u.id = ep.user_id 
      WHERE ep.status = 'active'
    `);

    let processed = 0;
    let errors = [];

    for (const emp of employees.rows) {
      try {
        const structure = await this.getEmployeeSalaryStructure(emp.id);
        if (!structure) {
          errors.push(`No salary structure for employee ${emp.employee_id}`);
          continue;
        }

        const gross = await this.calculateGrossPay(structure);
        const deductions = await this.calculateDeductions(
          gross.gross_pay,
          structure.loan_deduction,
          structure.insurance_deduction
        );

        await db.query(
          `INSERT INTO payroll (payroll_period_id, employee_id, basic_salary, housing_allowance, transport_allowance, 
           medical_allowance, leave_allowance, bonus, overtime_pay, other_allowances, gross_pay,
           sha_deduction, paye_tax, loan_deduction, insurance_deduction, other_deductions,
           total_deductions, net_pay, payment_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           ON CONFLICT (payroll_period_id, employee_id) DO UPDATE SET
           basic_salary=EXCLUDED.basic_salary, gross_pay=EXCLUDED.gross_pay, total_deductions=EXCLUDED.total_deductions,
           net_pay=EXCLUDED.net_pay, payment_status='pending', updated_at=CURRENT_TIMESTAMP`,
          [payrollPeriodId, emp.id, gross.basic_salary, gross.housing_allowance, gross.transport_allowance,
           gross.medical_allowance, gross.leave_allowance, gross.bonus, gross.overtime_pay, gross.other_allowances,
           gross.gross_pay, deductions.sha_deduction, deductions.paye_tax,
           deductions.loan_deduction, deductions.insurance_deduction, deductions.other_deductions,
           deductions.total_deductions, deductions.net_pay]
        );

        await db.query(
          `UPDATE payroll_periods SET status = 'processing', processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [payrollPeriodId]
        );

        processed++;
      } catch (err) {
        errors.push(`Employee ${emp.employee_id}: ${err.message}`);
      }
    }

    return { processed, errors, totalEmployees: employees.rows.length };
  }

  static async generatePayslips(payrollPeriodId) {
    const entries = await db.query(`
      SELECT p.*, ep.employee_id FROM payroll p
      JOIN employee_profiles ep ON ep.id = p.employee_id
      WHERE p.payroll_period_id = $1 AND p.payment_status IN ('paid', 'processing')
    `, [payrollPeriodId]);

    for (const entry of entries.rows) {
      const payslipNumber = `PS-${entry.employee_id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.query(
        `INSERT INTO payslips (payroll_id, employee_id, payslip_number, gross_pay, total_deductions, net_pay)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [entry.id, entry.employee_id, payslipNumber, entry.gross_pay, entry.total_deductions, entry.net_pay]
      );
    }

    return { generated: entries.rows.length };
  }
}

module.exports = PayrollEngine;
