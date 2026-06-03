const { pool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const authService = require('../services/authService');

const list = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { search, departmentId, status, employmentType, position } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (search) {
      where += ` AND (ep.full_name ILIKE $${idx} OR ep.employee_id ILIKE $${idx} OR ep.email ILIKE $${idx} OR ep.national_id ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (departmentId) {
      where += ` AND ep.department_id = $${idx++}`;
      params.push(departmentId);
    }
    if (status) {
      where += ` AND ep.employment_status = $${idx++}`;
      params.push(status);
    }
    if (employmentType) {
      where += ` AND ep.employment_type = $${idx++}`;
      params.push(employmentType);
    }
    if (position) {
      where += ` AND ep.position ILIKE $${idx++}`;
      params.push(`%${position}%`);
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM employee_profiles ep ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT ep.*, d.name as department_name, d.code as department_code,
              u.email as user_email, u.is_active as user_active
       FROM employee_profiles ep
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN users u ON ep.user_id = u.id
       ${where}
       ORDER BY ep.full_name LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ep.*, d.name as department_name, d.code as department_code,
              u.email as user_email, u.is_active as user_active, r.name as role_name, r.id as role_id
       FROM employee_profiles ep
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN users u ON ep.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE ep.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Employee not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      fullName, email, gender, dateOfBirth, nationalId, passportNumber,
      phone, phoneSecondary, departmentId, position, jobTitle,
      employmentType, employmentStatus, dateHired,
      contractStartDate, contractEndDate, probationEndDate,
      address, city, state, postalCode, country,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      emergencyContactName2, emergencyContactPhone2,
      bankName, bankAccountNumber, bankAccountName,
      taxId, socialSecurityNumber, notes
    } = req.body;

    const existing = await pool.query('SELECT id FROM employee_profiles WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new BadRequestError('Email already associated with an employee');
    }

    const deptResult = await pool.query('SELECT code FROM departments WHERE id = $1', [departmentId]);
    const deptCode = deptResult.rows[0]?.code || 'GEN';
    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const employeeId = `ERP-${year}-${deptCode}-${seq}`;

    const result = await pool.query(
      `INSERT INTO employee_profiles (
        employee_id, full_name, email, gender, date_of_birth, national_id, passport_number,
        phone, phone_secondary, department_id, position, job_title,
        employment_type, employment_status, date_hired,
        contract_start_date, contract_end_date, probation_end_date,
        address, city, state, postal_code, country,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        emergency_contact_name_2, emergency_contact_phone_2,
        bank_name, bank_account_number, bank_account_name,
        tax_id, social_security_number, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
      RETURNING *`,
      [employeeId, fullName, email, gender, dateOfBirth, nationalId, passportNumber,
       phone, phoneSecondary, departmentId, position, jobTitle,
       employmentType || 'full_time', employmentStatus || 'active', dateHired,
       contractStartDate, contractEndDate, probationEndDate,
       address, city, state, postalCode, country,
       emergencyContactName, emergencyContactPhone, emergencyContactRelation,
       emergencyContactName2, emergencyContactPhone2,
       bankName, bankAccountNumber, bankAccountName,
       taxId, socialSecurityNumber, notes]
    );

    await authService.logAudit(req.user.id, 'CREATE_EMPLOYEE', 'employees',
      result.rows[0].id, { employeeId }, req.ip);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const existing = await pool.query('SELECT id FROM employee_profiles WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError('Employee not found');

    const fieldMap = {
      fullName: 'full_name', gender: 'gender', dateOfBirth: 'date_of_birth',
      nationalId: 'national_id', passportNumber: 'passport_number',
      phone: 'phone', phoneSecondary: 'phone_secondary',
      departmentId: 'department_id', position: 'position', jobTitle: 'job_title',
      employmentType: 'employment_type', employmentStatus: 'employment_status',
      dateHired: 'date_hired', contractStartDate: 'contract_start_date',
      contractEndDate: 'contract_end_date', probationEndDate: 'probation_end_date',
      address: 'address', city: 'city', state: 'state', postalCode: 'postal_code',
      country: 'country', emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelation: 'emergency_contact_relation',
      emergencyContactName2: 'emergency_contact_name_2',
      emergencyContactPhone2: 'emergency_contact_phone_2',
      bankName: 'bank_name', bankAccountNumber: 'bank_account_number',
      bankAccountName: 'bank_account_name', taxId: 'tax_id',
      socialSecurityNumber: 'social_security_number', notes: 'notes'
    };

    const updates = [];
    const params = [];
    let idx = 1;

    for (const [camel, dbCol] of Object.entries(fieldMap)) {
      if (fields[camel] !== undefined) {
        updates.push(`${dbCol} = $${idx++}`);
        params.push(fields[camel]);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      const result = await pool.query(
        `UPDATE employee_profiles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      await authService.logAudit(req.user.id, 'UPDATE_EMPLOYEE', 'employees', id, {}, req.ip);
      return res.json({ success: true, data: result.rows[0] });
    }

    res.json({ success: true, message: 'No changes made' });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM employee_profiles WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) throw new NotFoundError('Employee not found');
    await authService.logAudit(req.user.id, 'DELETE_EMPLOYEE', 'employees', id, {}, req.ip);
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    next(err);
  }
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');
    const photoPath = req.file.path;
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE employee_profiles SET passport_photo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [photoPath, id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Employee not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, uploadPhoto };
