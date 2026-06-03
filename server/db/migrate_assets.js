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
-- VENDORS / SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_code VARCHAR(50) NOT NULL UNIQUE,
  vendor_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(100),
  payment_terms VARCHAR(100),
  services TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSET CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name VARCHAR(255) NOT NULL UNIQUE,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES asset_categories(id),
  default_depreciation_method VARCHAR(50) DEFAULT 'straight_line',
  default_useful_life_years INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSETS (MASTER TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_tag VARCHAR(100) NOT NULL UNIQUE,
  asset_code VARCHAR(100) NOT NULL UNIQUE,
  asset_name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES asset_categories(id),
  sub_category VARCHAR(100),
  description TEXT,
  serial_number VARCHAR(200),
  model_number VARCHAR(200),
  manufacturer VARCHAR(255),
  supplier_id UUID REFERENCES vendors(id),
  purchase_date DATE,
  purchase_cost DECIMAL(15,2) DEFAULT 0,
  current_value DECIMAL(15,2) DEFAULT 0,
  residual_value DECIMAL(15,2) DEFAULT 0,
  depreciation_method VARCHAR(50) DEFAULT 'straight_line',
  useful_life_years INTEGER DEFAULT 5,
  depreciation_rate DECIMAL(5,2) DEFAULT 0,
  accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
  monthly_depreciation DECIMAL(15,2) DEFAULT 0,
  warranty_expiry DATE,
  warranty_notes TEXT,
  condition VARCHAR(50) DEFAULT 'new',
  status VARCHAR(50) DEFAULT 'available',
  location VARCHAR(255),
  room VARCHAR(100),
  floor VARCHAR(50),
  building VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  assigned_to UUID REFERENCES employee_profiles(id),
  image_url VARCHAR(500),
  qr_code TEXT,
  barcode VARCHAR(200),
  lifecycle_status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSET DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES employee_profiles(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSET ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES employee_profiles(id),
  assigned_department_id UUID REFERENCES departments(id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  returned_date DATE,
  assignment_type VARCHAR(50) DEFAULT 'checkout',
  condition_at_assignment TEXT,
  condition_at_return TEXT,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  assigned_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSET TRANSFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_employee UUID REFERENCES employee_profiles(id),
  to_employee UUID REFERENCES employee_profiles(id),
  from_department UUID REFERENCES departments(id),
  to_department UUID REFERENCES departments(id),
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  approved_by UUID REFERENCES employee_profiles(id),
  approved_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FLEET VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_code VARCHAR(100) NOT NULL UNIQUE,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  vehicle_type VARCHAR(100),
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  chassis_number VARCHAR(200),
  engine_number VARCHAR(200),
  fuel_type VARCHAR(50),
  tank_capacity INTEGER,
  seating_capacity INTEGER,
  asset_id UUID REFERENCES assets(id),
  department_id UUID REFERENCES departments(id),
  assigned_driver UUID REFERENCES employee_profiles(id),
  purchase_date DATE,
  purchase_cost DECIMAL(15,2),
  current_mileage INTEGER DEFAULT 0,
  last_service_mileage INTEGER DEFAULT 0,
  insurance_policy_id UUID,
  road_tax_expiry DATE,
  license_expiry DATE,
  status VARCHAR(50) DEFAULT 'active',
  condition VARCHAR(50) DEFAULT 'good',
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FUEL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES employee_profiles(id),
  fuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
  liters DECIMAL(10,2) NOT NULL,
  cost_per_liter DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  odometer_reading INTEGER,
  fuel_station VARCHAR(255),
  receipt_number VARCHAR(100),
  fuel_type VARCHAR(50),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TRIP LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES employee_profiles(id),
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  start_location VARCHAR(255),
  end_location VARCHAR(255),
  purpose TEXT,
  start_odometer INTEGER,
  end_odometer INTEGER,
  distance_km INTEGER,
  approved_by UUID REFERENCES employee_profiles(id),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MAINTENANCE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_number VARCHAR(100) NOT NULL UNIQUE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
  maintenance_type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium',
  scheduled_date DATE,
  start_date DATE,
  completion_date DATE,
  vendor_id UUID REFERENCES vendors(id),
  technician_name VARCHAR(255),
  cost DECIMAL(15,2) DEFAULT 0,
  parts_cost DECIMAL(15,2) DEFAULT 0,
  labor_cost DECIMAL(15,2) DEFAULT 0,
  odometer_at_service INTEGER,
  service_interval_km INTEGER,
  service_interval_days INTEGER,
  next_service_date DATE,
  next_service_odometer INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES employee_profiles(id),
  approved_at TIMESTAMP,
  result_notes TEXT,
  created_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSET INSURANCE POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number VARCHAR(200) NOT NULL UNIQUE,
  insurance_type VARCHAR(100) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_contact VARCHAR(255),
  provider_phone VARCHAR(50),
  provider_email VARCHAR(255),
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
  coverage_type VARCHAR(100),
  coverage_amount DECIMAL(15,2) DEFAULT 0,
  premium_amount DECIMAL(15,2) DEFAULT 0,
  premium_frequency VARCHAR(50) DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  documents TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INSURANCE CLAIMS
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES asset_insurance_policies(id) ON DELETE CASCADE,
  claim_number VARCHAR(100) NOT NULL UNIQUE,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  claim_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  approved_amount DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'submitted',
  incident_date DATE,
  incident_type VARCHAR(100),
  resolution_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DEPRECIATION RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS depreciation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  opening_value DECIMAL(15,2) NOT NULL,
  depreciation_amount DECIMAL(15,2) NOT NULL,
  closing_value DECIMAL(15,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asset_id, period_year, period_month)
);

-- ============================================================
-- ASSET DISPOSAL
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_disposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  disposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  disposal_type VARCHAR(50) NOT NULL,
  reason TEXT,
  disposal_value DECIMAL(15,2) DEFAULT 0,
  book_value DECIMAL(15,2) DEFAULT 0,
  gain_loss DECIMAL(15,2) DEFAULT 0,
  buyer_name VARCHAR(255),
  buyer_contact VARCHAR(255),
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES employee_profiles(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SPARE PARTS INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_code VARCHAR(100) NOT NULL UNIQUE,
  part_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  unit_of_measure VARCHAR(50),
  quantity_in_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  supplier_id UUID REFERENCES vendors(id),
  location VARCHAR(255),
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  reference_type VARCHAR(100),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES employee_profiles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ASSET AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned ON assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle ON assets(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_employee ON asset_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_status ON asset_assignments(status);
CREATE INDEX IF NOT EXISTS idx_fleet_dept ON fleet_vehicles(department_id);
CREATE INDEX IF NOT EXISTS idx_fleet_driver ON fleet_vehicles(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_fleet_status ON fleet_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_logs(fuel_date);
CREATE INDEX IF NOT EXISTS idx_trip_vehicle ON trip_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_date ON trip_logs(trip_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON maintenance_records(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_insurance_asset ON asset_insurance_policies(asset_id);
CREATE INDEX IF NOT EXISTS idx_insurance_vehicle ON asset_insurance_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_insurance_expiry ON asset_insurance_policies(end_date);
CREATE INDEX IF NOT EXISTS idx_depreciation_asset ON depreciation_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_disposal_asset ON asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_stock_part ON stock_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_asset_audit_asset ON asset_audit_log(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_action ON asset_audit_log(action);
`;

async function migrate() {
  try {
    console.log('Running Asset/Fleet/Maintenance/Insurance migration...');
    await pool.query(schema);
    console.log('Asset module migration completed successfully.');
    console.log('Tables: vendors, asset_categories, assets, asset_documents, asset_assignments, asset_transfers, fleet_vehicles, fuel_logs, trip_logs, maintenance_records, asset_insurance_policies, insurance_claims, depreciation_records, asset_disposals, spare_parts, stock_movements, asset_audit_log');
    process.exit(0);
  } catch (err) {
    console.error('Asset migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
