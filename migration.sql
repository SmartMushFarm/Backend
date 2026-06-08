-- FK: products.category_id -> categories.id
alter table products
add constraint fk_products_category
foreign key (category_id)
references categories(id)
on delete set null;

-- USERS
create table users (
  id bigint generated always as identity primary key,
  name text not null,
  email text unique not null,
  password text not null,
  role text default 'Customer'
    check (role in ('Customer', 'Admin')),
  status text default 'Active'
    check (status in ('Active', 'Inactive')),
  phone text,
  address text,
  created_at timestamptz default now()
);

-- CART
create table cart (
  id bigint generated always as identity primary key,
  user_id bigint unique references users(id) on delete cascade,
  created_at timestamptz default now()
);

-- CART ITEMS
create table cart_items (
  id bigint generated always as identity primary key,
  cart_id bigint references cart(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  quantity int default 1 check (quantity > 0),
  unique(cart_id, product_id)
);

-- PROMOTIONS
create table promotions (
  id bigint generated always as identity primary key,
  code text unique not null,
  discount_percent numeric(5,2)
    check (discount_percent >= 0 and discount_percent <= 100),
  valid_from timestamptz,
  valid_to timestamptz,
  status text default 'Active'
    check (status in ('Active', 'Inactive')),
  created_at timestamptz default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

-- ORDERS
create table orders (
  id bigint generated always as identity primary key,
  user_id bigint references users(id) on delete set null,
  promotion_id bigint references promotions(id) on delete set null,
  order_date timestamptz default now(),
  status text default 'Pending'
    check (status in ('Pending', 'Confirmed', 'Shipping', 'Completed', 'Cancelled')),
  total_amount numeric(10,2) default 0 check (total_amount >= 0),
  shipping_address text,
  created_at timestamptz default now()
);

-- ORDER DETAILS
create table order_details (
  id bigint generated always as identity primary key,
  order_id bigint references orders(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  quantity int not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0)
);

-- PAYMENTS
create table payments (
  id bigint generated always as identity primary key,
  order_id bigint unique references orders(id) on delete cascade,
  payment_status text default 'Pending'
    check (payment_status in ('Pending', 'Paid', 'Failed', 'Refunded')),
  amount numeric(10,2) check (amount >= 0),
  payment_method text
    check (payment_method in ('COD', 'Banking', 'Momo', 'VNPAY')),
    qr_code text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- DEVICES
create table devices (
  id bigint generated always as identity primary key,
  owner_id bigint references users(id) on delete cascade,
  product_id bigint references products(id) on delete set null,

  device_name text not null,

  current_humidity int check (current_humidity between 0 and 100),
  current_temperature numeric(5,2),

  status text default 'Active'
    check (status in ('Active', 'Inactive', 'Maintenance')),

  mist_status boolean default false,
  fan_status boolean default false,
  heater_status boolean default false,
  light_status boolean default false,

  mode text default 'Auto'
    check (mode in ('Auto', 'Manual')),

  created_at timestamptz default now()
);

-- PRESETS
create table presets (
  id bigint generated always as identity primary key,
  device_id bigint references devices(id) on delete cascade,

  preset_name text not null,
  mushroom_type text,

  is_active boolean default false,

  mist_on_humidity int check (mist_on_humidity between 0 and 100),
  mist_off_humidity int check (mist_off_humidity between 0 and 100),
  fan_on_humidity int check (fan_on_humidity between 0 and 100),
  fan_off_humidity int check (fan_off_humidity between 0 and 100),

  heater_on_temp numeric(5,2),
  heater_off_temp numeric(5,2),

  danger_humidity int check (danger_humidity between 0 and 100),
  max_temp_danger numeric(5,2),

  mist_pulse_on_seconds int check (mist_pulse_on_seconds >= 0),
  mist_pulse_off_seconds int check (mist_pulse_off_seconds >= 0),

  created_at timestamptz default now()
);

create unique index unique_active_preset_per_device
on presets(device_id)
where is_active = true;

-- HISTORY
create table history (
  id bigint generated always as identity primary key,
  device_id bigint references devices(id) on delete cascade,

  temperature numeric(5,2),
  humidity int check (humidity between 0 and 100),

  mist_status boolean,
  fan_status boolean,
  heater_status boolean,
  light_status boolean,

  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  id bigint generated always as identity primary key,

  user_id bigint references users(id) on delete cascade,
  device_id bigint references devices(id) on delete cascade,

  title text not null,
  message text not null,

  type text default 'Info'
    check (type in ('Info', 'Warning', 'Danger', 'Maintenance')),

  is_read boolean default false,

  created_at timestamptz default now()
);

-- MAINTENANCE REQUESTS
create table maintenance_requests (
  id bigint generated always as identity primary key,

  user_id bigint references users(id) on delete cascade,
  device_id bigint references devices(id) on delete set null,

  title text not null,
  description text not null,

  status text default 'Pending'
    check (status in ('Pending', 'Received', 'Processing', 'Completed', 'Cancelled')),

  priority text default 'Normal'
    check (priority in ('Low', 'Normal', 'High', 'Urgent')),

  assigned_admin_id bigint references users(id) on delete set null,

  admin_note text,
  scheduled_date timestamptz,
  completed_at timestamptz,

  created_at timestamptz default now()
);

-- INDEXES
create index idx_products_category
on products(category_id);

create index idx_order_user
on orders(user_id);

create index idx_cart_user
on cart(user_id);

create index idx_cart_items_cart
on cart_items(cart_id);

create index idx_device_owner
on devices(owner_id);

create index idx_history_device_created_at
on history(device_id, created_at desc);

create index idx_notifications_user
on notifications(user_id, is_read);

create index idx_maintenance_user
on maintenance_requests(user_id);

create index idx_maintenance_status
on maintenance_requests(status);
 