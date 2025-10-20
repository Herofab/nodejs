-- Enhanced Bottle Tracking Schema

-- 1. Update bottles table with tracking fields
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS current_location VARCHAR(255);
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS current_vehicle_id INTEGER REFERENCES vehicles(id);
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS current_customer_id INTEGER REFERENCES customers(id);
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP DEFAULT NOW();

-- 2. Create bottle_movements table for tracking history
CREATE TABLE IF NOT EXISTS bottle_movements (
    id SERIAL PRIMARY KEY,
    bottle_id INTEGER REFERENCES bottles(id),
    order_id INTEGER REFERENCES orders(id),
    assignment_id INTEGER REFERENCES order_assignments(id),
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    customer_id INTEGER REFERENCES customers(id),
    movement_type VARCHAR(50), -- 'pickup', 'delivery', 'return', 'transfer'
    movement_date TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create order_bottles table for tracking which specific bottles are assigned to orders
CREATE TABLE IF NOT EXISTS order_bottles (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    assignment_id INTEGER REFERENCES order_assignments(id),
    bottle_id INTEGER REFERENCES bottles(id),
    quantity_assigned INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'loaded', 'delivered', 'returned'
    assigned_date TIMESTAMP DEFAULT NOW(),
    delivery_date TIMESTAMP,
    return_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bottles_status ON bottles(status);
CREATE INDEX IF NOT EXISTS idx_bottles_current_location ON bottles(current_location);
CREATE INDEX IF NOT EXISTS idx_bottle_movements_bottle_id ON bottle_movements(bottle_id);
CREATE INDEX IF NOT EXISTS idx_bottle_movements_order_id ON bottle_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_order_bottles_order_id ON order_bottles(order_id);
CREATE INDEX IF NOT EXISTS idx_order_bottles_bottle_id ON order_bottles(bottle_id);