const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_system',
});

const schema = `
-- ============================================================
-- PROCUREMENT CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name VARCHAR(255) NOT NULL UNIQUE,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requester_id UUID NOT NULL REFERENCES employee_profiles(id),
  department_id UUID REFERENCES departments(id),
  category_id UUID REFERENCES procurement_categories(id),
  urgency VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'draft',
  total_estimated_cost DECIMAL(15,2) DEFAULT 0,
  budget_code VARCHAR(100),
  notes TEXT,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT REQUEST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50),
  estimated_unit_cost DECIMAL(12,2) DEFAULT 0,
  estimated_total_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES employee_profiles(id),
  approval_level INTEGER NOT NULL,
  approver_role VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  comments TEXT,
  action_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id),
  fiscal_year INTEGER NOT NULL,
  total_budget DECIMAL(15,2) DEFAULT 0,
  allocated_amount DECIMAL(15,2) DEFAULT 0,
  spent_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code VARCHAR(50) NOT NULL UNIQUE,
  supplier_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  alternative_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Kenya',
  tax_id VARCHAR(100),
  payment_terms VARCHAR(100),
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  supplier_category VARCHAR(100),
  rating DECIMAL(3,1) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SUPPLIER CONTRACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES procurement_suppliers(id) ON DELETE CASCADE,
  contract_number VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value DECIMAL(15,2) DEFAULT 0,
  terms TEXT,
  status VARCHAR(50) DEFAULT 'active',
  document_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SUPPLIER PERFORMANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES procurement_suppliers(id) ON DELETE CASCADE,
  po_id UUID,
  delivery_on_time BOOLEAN,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  delivery_date DATE,
  notes TEXT,
  rated_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number VARCHAR(100) NOT NULL UNIQUE,
  request_id UUID REFERENCES procurement_requests(id),
  supplier_id UUID REFERENCES procurement_suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  shipping_address TEXT,
  payment_terms VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES employee_profiles(id),
  approved_by UUID REFERENCES employee_profiles(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PURCHASE ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  request_item_id UUID REFERENCES procurement_request_items(id),
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_received INTEGER DEFAULT 0,
  unit_of_measure VARCHAR(50),
  unit_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  capacity VARCHAR(100),
  manager_id UUID REFERENCES employee_profiles(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- WAREHOUSE BINS
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouse_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  bin_code VARCHAR(50) NOT NULL,
  bin_name VARCHAR(255),
  max_capacity INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(warehouse_id, bin_code)
);

-- ============================================================
-- INVENTORY CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name VARCHAR(255) NOT NULL UNIQUE,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INVENTORY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code VARCHAR(100) NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES inventory_categories(id),
  unit_of_measure VARCHAR(50),
  warehouse_id UUID REFERENCES warehouses(id),
  bin_id UUID REFERENCES warehouse_bins(id),
  current_quantity INTEGER DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  maximum_quantity INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  average_cost DECIMAL(12,2) DEFAULT 0,
  supplier_id UUID REFERENCES procurement_suppliers(id),
  barcode VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  batch_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STOCK MOVEMENTS (Procurement Inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  reference_type VARCHAR(100),
  reference_id UUID,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  notes TEXT,
  created_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- GOODS RECEIVED NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number VARCHAR(100) NOT NULL UNIQUE,
  po_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID REFERENCES procurement_suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_note_number VARCHAR(100),
  invoice_number VARCHAR(100),
  received_by UUID REFERENCES employee_profiles(id),
  created_by UUID REFERENCES employee_profiles(id),
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE goods_received_notes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employee_profiles(id);

-- ============================================================
-- GOODS RECEIVED ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_received_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id UUID NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES purchase_order_items(id),
  item_id UUID REFERENCES inventory_items(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL,
  quantity_accepted INTEGER NOT NULL,
  quantity_rejected INTEGER DEFAULT 0,
  rejection_reason TEXT,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DELIVERY DISCREPANCIES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_item_id UUID REFERENCES goods_received_items(id) ON DELETE CASCADE,
  discrepancy_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  reported_by UUID REFERENCES employee_profiles(id),
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INVENTORY AUDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_number VARCHAR(100) NOT NULL UNIQUE,
  warehouse_id UUID REFERENCES warehouses(id),
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  audit_type VARCHAR(50) DEFAULT 'full',
  status VARCHAR(50) DEFAULT 'planned',
  conducted_by UUID REFERENCES employee_profiles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INVENTORY AUDIT ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_audit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  expected_quantity INTEGER NOT NULL,
  actual_quantity INTEGER NOT NULL,
  variance INTEGER DEFAULT 0,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  variance_value DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INVENTORY ADJUSTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  audit_item_id UUID REFERENCES inventory_audit_items(id),
  adjustment_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  reason TEXT,
  approved_by UUID REFERENCES employee_profiles(id),
  approved_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROCUREMENT AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES employee_profiles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pr_requester ON procurement_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_pr_department ON procurement_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_category ON procurement_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_pr_number ON procurement_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_pr_items_request ON procurement_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_pr_approvals_request ON procurement_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_pr_approvals_approver ON procurement_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_pr_approvals_status ON procurement_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pr_budget_dept ON procurement_budgets(department_id);
CREATE INDEX IF NOT EXISTS idx_pr_budget_year ON procurement_budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ps_status ON procurement_suppliers(status);
CREATE INDEX IF NOT EXISTS idx_ps_rating ON procurement_suppliers(rating);
CREATE INDEX IF NOT EXISTS idx_sc_supplier ON supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sc_expiry ON supplier_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_sp_supplier ON supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_request ON purchase_orders(request_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_req ON purchase_order_items(request_item_id);
CREATE INDEX IF NOT EXISTS idx_wh_code ON warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_wh_bins_warehouse ON warehouse_bins(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ic_category ON inventory_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_ii_code ON inventory_items(item_code);
CREATE INDEX IF NOT EXISTS idx_ii_warehouse ON inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ii_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_ii_reorder ON inventory_items(reorder_point);
CREATE INDEX IF NOT EXISTS idx_ii_expiry ON inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_psm_item ON procurement_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_psm_type ON procurement_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_psm_reference ON procurement_stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_received_notes(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON goods_received_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_warehouse ON goods_received_notes(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON goods_received_notes(status);
CREATE INDEX IF NOT EXISTS idx_gri_grn ON goods_received_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_gri_item ON goods_received_items(item_id);
CREATE INDEX IF NOT EXISTS idx_dd_grn ON delivery_discrepancies(grn_item_id);
CREATE INDEX IF NOT EXISTS idx_ia_warehouse ON inventory_audits(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ia_status ON inventory_audits(status);
CREATE INDEX IF NOT EXISTS idx_iai_audit ON inventory_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_iai_item ON inventory_audit_items(item_id);
CREATE INDEX IF NOT EXISTS idx_iadj_item ON inventory_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_iadj_status ON inventory_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_pal_entity ON procurement_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pal_action ON procurement_audit_log(action);
`;

async function migrate() {
  try {
    console.log('Running Procurement/Inventory/Supplier migration...');
    await pool.query(schema);
    console.log('Procurement module migration completed successfully.');
    console.log('Tables: procurement_categories, procurement_requests, procurement_request_items, procurement_approvals, procurement_attachments, procurement_budgets, procurement_suppliers, supplier_contracts, supplier_performance, purchase_orders, purchase_order_items, warehouses, warehouse_bins, inventory_categories, inventory_items, procurement_stock_movements, goods_received_notes, goods_received_items, delivery_discrepancies, inventory_audits, inventory_audit_items, inventory_adjustments, procurement_audit_log');
    process.exit(0);
  } catch (err) {
    console.error('Procurement migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
