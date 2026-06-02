-- SmartMushFarm Database Migration
-- Run this in Supabase SQL Editor

-- Carts
CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  shipping_address TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Shipping','Completed','Cancelled')),
  promotion_id INTEGER REFERENCES promotions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Details
CREATE TABLE IF NOT EXISTS order_details (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('COD','BankTransfer','MoMo','VNPay')),
  amount NUMERIC(12,2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending','Paid','Failed','Refunded')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  device_name VARCHAR(100) NOT NULL,
  current_temperature NUMERIC(5,2),
  current_humidity NUMERIC(5,2),
  mist_status BOOLEAN DEFAULT FALSE,
  fan_status BOOLEAN DEFAULT FALSE,
  heater_status BOOLEAN DEFAULT FALSE,
  light_status BOOLEAN DEFAULT FALSE,
  mode VARCHAR(10) DEFAULT 'Manual' CHECK (mode IN ('Manual','Auto')),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Maintenance')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Device Sensor History
CREATE TABLE IF NOT EXISTS device_sensor_history (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  mist_status BOOLEAN DEFAULT FALSE,
  fan_status BOOLEAN DEFAULT FALSE,
  heater_status BOOLEAN DEFAULT FALSE,
  light_status BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Presets
CREATE TABLE IF NOT EXISTS presets (
  id SERIAL PRIMARY KEY,
  preset_name VARCHAR(100) NOT NULL,
  mushroom_type VARCHAR(100),
  mist_on_humidity NUMERIC(5,2),
  mist_off_humidity NUMERIC(5,2),
  heater_on_temp NUMERIC(5,2),
  heater_off_temp NUMERIC(5,2),
  danger_humidity NUMERIC(5,2),
  max_temp_danger NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Device Presets (which preset is applied to which device)
CREATE TABLE IF NOT EXISTS device_presets (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  preset_id INTEGER NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Components (linh kien)
CREATE TABLE IF NOT EXISTS components (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_price NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Device Components (linh kien trong hop nuoi nam)
CREATE TABLE IF NOT EXISTS device_components (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES components(id),
  quantity INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'Working' CHECK (status IN ('Working','Broken','Replaced','Maintenance')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  device_id INTEGER NOT NULL REFERENCES devices(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(10) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Received','Processing','Completed','Rejected','Cancelled')),
  technician_id INTEGER REFERENCES users(id),
  scheduled_date TIMESTAMP,
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Broken Components
CREATE TABLE IF NOT EXISTS maintenance_broken_components (
  id SERIAL PRIMARY KEY,
  maintenance_request_id INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  device_component_id INTEGER NOT NULL REFERENCES device_components(id),
  note TEXT,
  repair_action VARCHAR(20) DEFAULT 'Repair' CHECK (repair_action IN ('Repair','Replace')),
  price NUMERIC(12,2) DEFAULT 0
);

-- Repair Bills
CREATE TABLE IF NOT EXISTS repair_bills (
  id SERIAL PRIMARY KEY,
  maintenance_request_id INTEGER NOT NULL REFERENCES maintenance_requests(id),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Paid','Cancelled')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'General',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_history_device_id ON device_sensor_history(device_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_user_id ON maintenance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_technician_id ON maintenance_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
