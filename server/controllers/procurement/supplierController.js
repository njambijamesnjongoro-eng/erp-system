const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.query.status) {
      conditions.push(`status = $${idx++}`);
      params.push(req.query.status);
    }
    if (req.query.category) {
      conditions.push(`supplier_category = $${idx++}`);
      params.push(req.query.category);
    }
    if (req.query.min_rating) {
      conditions.push(`rating >= $${idx++}`);
      params.push(parseFloat(req.query.min_rating));
    }
    if (req.query.search) {
      conditions.push(`(supplier_name ILIKE $${idx} OR supplier_code ILIKE $${idx} OR contact_person ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${req.query.search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT *, COUNT(*) OVER() as total
       FROM procurement_suppliers
       ${whereClause}
       ORDER BY supplier_name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;

    res.json({ success: true, data: result.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplierResult = await db.query(
      `SELECT * FROM procurement_suppliers WHERE id = $1`,
      [id]
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const contractsResult = await db.query(
      `SELECT * FROM supplier_contracts WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    const ratingResult = await db.query(
      `SELECT COALESCE(AVG(rating), 0) as average_rating FROM supplier_performance WHERE supplier_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...supplierResult.rows[0],
        recent_contracts: contractsResult.rows,
        average_rating: parseFloat(ratingResult.rows[0].average_rating)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const maxResult = await db.query(
      `SELECT MAX(CAST(SUBSTRING(supplier_code FROM 'PS-(\d+)') AS INTEGER)) as max_code FROM procurement_suppliers`
    );
    const nextCode = (maxResult.rows[0].max_code || 0) + 1;
    const supplierCode = `PS-${String(nextCode).padStart(4, '0')}`;

    const { supplier_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, supplier_category, notes } = req.body;

    const result = await db.query(
      `INSERT INTO procurement_suppliers (supplier_code, supplier_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, supplier_category, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
       RETURNING *`,
      [supplierCode, supplier_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, supplier_category, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, supplier_category, notes } = req.body;

    const existing = await db.query('SELECT * FROM procurement_suppliers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const result = await db.query(
      `UPDATE procurement_suppliers
       SET supplier_name = COALESCE($1, supplier_name),
           contact_person = COALESCE($2, contact_person),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           country = COALESCE($7, country),
           tax_id = COALESCE($8, tax_id),
           payment_terms = COALESCE($9, payment_terms),
           supplier_category = COALESCE($10, supplier_category),
           notes = COALESCE($11, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [supplier_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, supplier_category, notes, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.blacklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(
      `UPDATE procurement_suppliers
       SET is_blacklisted = true, status = 'blacklisted', blacklist_reason = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.whitelist = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE procurement_suppliers
       SET is_blacklisted = false, status = 'active', blacklist_reason = null, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM supplier_contracts WHERE supplier_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createContract = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const maxResult = await db.query(
      `SELECT MAX(CAST(SUBSTRING(contract_number FROM 'CTR-${currentYear}-(\d+)') AS INTEGER)) as max_num
       FROM supplier_contracts WHERE contract_number LIKE $1`,
      [`CTR-${currentYear}-%`]
    );
    const nextNum = (maxResult.rows[0].max_num || 0) + 1;
    const contractNumber = `CTR-${currentYear}-${String(nextNum).padStart(4, '0')}`;

    const { supplier_id, title, description, start_date, end_date, terms, value, status } = req.body;

    const result = await db.query(
      `INSERT INTO supplier_contracts (supplier_id, contract_number, title, description, start_date, end_date, terms, value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [supplier_id, contractNumber, title, description, start_date, end_date, terms, value, status || 'active']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT sp.*, ep.full_name as rated_by_name
       FROM supplier_performance sp
       JOIN employee_profiles ep ON sp.rated_by = ep.id
       WHERE sp.supplier_id = $1
       ORDER BY sp.created_at DESC`,
      [id]
    );

    const avgResult = await db.query(
      `SELECT COALESCE(AVG(quality_rating), 0) as quality_rating,
              COALESCE(AVG(communication_rating), 0) as communication_rating,
              COALESCE(
                (COUNT(*) FILTER (WHERE delivery_on_time = true)::float / NULLIF(COUNT(*), 0) * 100),
                0
              ) as on_time_delivery_pct
       FROM supplier_performance
       WHERE supplier_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        averages: {
          quality_rating: parseFloat(avgResult.rows[0].quality_rating).toFixed(2),
          communication_rating: parseFloat(avgResult.rows[0].communication_rating).toFixed(2),
          on_time_delivery_pct: parseFloat(avgResult.rows[0].on_time_delivery_pct).toFixed(2)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality_rating, communication_rating, delivery_on_time, notes } = req.body;

    await db.query(
      `INSERT INTO supplier_performance (supplier_id, quality_rating, communication_rating, delivery_on_time, notes, rated_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, quality_rating, communication_rating, delivery_on_time, notes, req.user.employeeId]
    );

    const avgResult = await db.query(
      `SELECT COALESCE(AVG((quality_rating + communication_rating) / 2.0), 0) as avg_rating
       FROM supplier_performance WHERE supplier_id = $1`,
      [id]
    );

    const newAvg = parseFloat(avgResult.rows[0].avg_rating);

    await db.query(
      `UPDATE procurement_suppliers SET rating = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newAvg, id]
    );

    res.status(201).json({ success: true, message: 'Rating submitted', data: { average_rating: newAvg } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpiringContracts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await db.query(
      `SELECT sc.*, ps.supplier_name, ps.supplier_code
       FROM supplier_contracts sc
       JOIN procurement_suppliers ps ON sc.supplier_id = ps.id
       WHERE sc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $1
       AND sc.status = 'active'
       ORDER BY sc.end_date ASC`,
      [days]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
