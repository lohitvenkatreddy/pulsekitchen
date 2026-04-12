-- Priority-Based Food Delivery System Database Schema
-- PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    cuisine_type VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    approval_status VARCHAR(50) DEFAULT 'approved',
    is_active BOOLEAN DEFAULT TRUE,
    is_open BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (Core table with priority fields)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    delivery_partner_id INTEGER,

    -- Order details
    items TEXT NOT NULL,  -- JSON string of order items
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,  -- JSON string with address details

    -- Priority scoring (THE KEY FEATURE)
    priority_level VARCHAR(50) DEFAULT 'normal',
    priority_score DECIMAL(5, 2) DEFAULT 0.00,
    urgency_score DECIMAL(5, 2) DEFAULT 0.00,
    distance_score DECIMAL(5, 2) DEFAULT 0.00,
    waiting_time_score DECIMAL(5, 2) DEFAULT 0.00,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',
    special_instructions TEXT,

    -- Timestamps
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Delivery partners table
CREATE TABLE delivery_partners (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT TRUE,
    current_order_id INTEGER REFERENCES orders(id),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table (extended for payment-service)
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    priority_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    gateway_response TEXT,
    payment_metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE
);

-- Notifications table (extended for notification-service)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'general',
    sent_via_push BOOLEAN DEFAULT FALSE,
    sent_via_sms BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Delivery assignments & tracking (delivery-service)
CREATE TABLE delivery_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_partner_id INTEGER NOT NULL REFERENCES delivery_partners(id),
    status VARCHAR(50) DEFAULT 'assigned',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    eta_minutes INTEGER,
    actual_distance_km DECIMAL(10, 2)
);

CREATE TABLE delivery_tracking (
    id SERIAL PRIMARY KEY,
    delivery_assignment_id INTEGER NOT NULL REFERENCES delivery_assignments(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refunds & saved cards (payment-service)
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    refund_transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE saved_payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL,
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    payment_token VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    device_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Saved delivery addresses (customer profile)
CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100),
    line1 TEXT NOT NULL,
    line2 TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Promotional coupons
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail for admin / system actions
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_priority_score ON orders(priority_score DESC);
CREATE INDEX idx_orders_priority_level ON orders(priority_level);
CREATE INDEX idx_delivery_partners_available ON delivery_partners(is_available);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_restaurants_owner ON restaurants(owner_user_id);
CREATE INDEX idx_coupons_code ON coupons(code);

-- Insert sample data
-- Demo password for all seeded users: password123
INSERT INTO users (email, password_hash, full_name, phone_number, role, is_verified) VALUES
('customer@test.com', '$2b$12$gR82Sy/.mErCIY1G.rEeDeeGmsm5Q2MFhHcVK1Uly8vOcgr6rI2iy', 'John Customer', '1234567890', 'customer', TRUE),
('restaurant@test.com', '$2b$12$gR82Sy/.mErCIY1G.rEeDeeGmsm5Q2MFhHcVK1Uly8vOcgr6rI2iy', 'Pizza Palace', '0987654321', 'restaurant', TRUE),
('delivery@test.com', '$2b$12$gR82Sy/.mErCIY1G.rEeDeeGmsm5Q2MFhHcVK1Uly8vOcgr6rI2iy', 'Mike Delivery', '1122334455', 'delivery_partner', TRUE),
('admin@test.com', '$2b$12$gR82Sy/.mErCIY1G.rEeDeeGmsm5Q2MFhHcVK1Uly8vOcgr6rI2iy', 'System Admin', '0000000000', 'admin', TRUE);

-- owner_user_id: 2 = restaurant@test.com for Pizza Palace
INSERT INTO restaurants (owner_user_id, name, address, latitude, longitude, cuisine_type, rating, review_count, approval_status, is_active, is_open, is_public) VALUES
(2, 'Pizza Palace', '123 Main St, City', 37.7749, -122.4194, 'Italian', 4.5, 0, 'approved', TRUE, TRUE, TRUE),
(NULL, 'Burger House', '456 Oak Ave, City', 37.7849, -122.4094, 'American', 4.2, 0, 'approved', TRUE, TRUE, TRUE),
(NULL, 'Taco Fiesta', '789 Pine Rd, City', 37.7649, -122.4294, 'Mexican', 4.7, 0, 'pending', TRUE, TRUE, TRUE),
(NULL, 'Dragon Wok', '321 Elm St, City', 37.7949, -122.3994, 'Chinese', 4.3, 0, 'approved', TRUE, FALSE, TRUE);

INSERT INTO menu_items (restaurant_id, name, description, price) VALUES
(1, 'Margherita Pizza', 'Classic tomato and mozzarella', 12.99),
(1, 'Pepperoni Pizza', 'Loaded with pepperoni', 14.99),
(1, 'Caesar Salad', 'Fresh romaine with caesar dressing', 8.99),
(2, 'Classic Burger', 'Beef patty with lettuce and tomato', 9.99),
(2, 'Cheese Fries', 'Crispy fries with cheese', 4.99),
(3, 'Chicken Tacos', 'Three soft shell tacos', 10.99),
(3, 'Burrito Bowl', 'Rice, beans, and your choice of protein', 11.99);

-- Sample delivery partner (user id 3 = delivery@test.com)
INSERT INTO delivery_partners (user_id, latitude, longitude, is_available, rating) VALUES
(3, 37.7750, -122.4195, TRUE, 4.8);

INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, is_active) VALUES
('WELCOME10', '10% off first order', 'percent', 10, 15.00, TRUE),
('FLAT5', '$5 off orders $25+', 'fixed', 5.00, 25.00, TRUE);

INSERT INTO user_addresses (user_id, label, line1, city, region, postal_code, latitude, longitude, is_default) VALUES
(1, 'Home', '100 Market St', 'San Francisco', 'CA', '94103', 37.7749, -122.4194, TRUE);
