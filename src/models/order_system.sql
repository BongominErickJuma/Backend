    -- For automatic assignment - store calculation details
CREATE TABLE IF NOT EXISTS orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,

    -- Order Information
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_status ENUM(
        'pending',
        'accepted',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'approved_by_client',
        'cancelled'
    ) DEFAULT 'pending',

    -- Financial Information
    order_amount DECIMAL(10, 2) NOT NULL CHECK (order_amount >= 0),
    delivery_fee DECIMAL(10, 2) DEFAULT 0,

    -- Patient Information
    patient_id INT NOT NULL,
    patient_location_lat DECIMAL(10, 8),
    patient_location_lng DECIMAL(11, 8),
    patient_contact VARCHAR(20) NOT NULL,

    -- Pickup Information (Partner's facility)
    partner_org_id INT NOT NULL,
    pickup_location_lat DECIMAL(10, 8),
    pickup_location_lng DECIMAL(11, 8),
    pickup_location_name VARCHAR(255),

    -- Delivery Assignment
    delivery_rider_id INT,
    assigned_at TIMESTAMP NULL,

    -- Status timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    picked_up_at TIMESTAMP NULL,
    in_transit_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    approved_by_client_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,

    -- Cancellation
    cancelled_by ENUM('patient', 'partner', 'rider', 'admin') NULL,
    cancellation_reason TEXT,

    -- Foreign Keys (FIXED)
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (partner_org_id) REFERENCES partner_organizations(partner_id),
    FOREIGN KEY (delivery_rider_id) REFERENCES delivery_riders(rider_id),

    -- Indexes (FIXED)
    INDEX idx_status (order_status),
    INDEX idx_patient (patient_id),
    INDEX idx_partner (partner_org_id),
    INDEX idx_rider (delivery_rider_id),
    INDEX idx_created (created_at)
);

-- 2. ORDER_ITEMS TABLE (Multiple items per order)
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    
    -- Item details (You might want to connect to a products/inventory table later)
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_quantity INT NOT NULL CHECK (item_quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    
    -- Medical specific fields (if needed)
    dosage VARCHAR(100),
    instructions TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    INDEX idx_order (order_id)
);

-- 3. ORDER_LOCATION_UPDATES TABLE (For real-time tracking)
CREATE TABLE IF NOT EXISTS order_location_updates (
    location_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    rider_id INT NOT NULL,
    
    -- Real-time location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT, -- GPS accuracy in meters
    speed FLOAT, -- Speed in km/h (optional)
    
    -- Additional tracking info
    update_type ENUM('pickup', 'delivery', 'in_transit', 'idle') DEFAULT 'in_transit',
    address_text VARCHAR(500), -- Human-readable address
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (rider_id) REFERENCES delivery_riders(rider_id),
    
    INDEX idx_order_tracking (order_id, created_at),
    INDEX idx_rider_tracking (rider_id, created_at)
);

-- 4. ORDER_STATUS_HISTORY TABLE (Track all status changes)
CREATE TABLE IF NOT EXISTS order_status_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    
    -- Status change details
    old_status ENUM(
        'pending', 'accepted', 'assigned', 'picked_up', 
        'in_transit', 'delivered', 'approved_by_client', 'cancelled'
    ),
    new_status ENUM(
        'pending', 'accepted', 'assigned', 'picked_up', 
        'in_transit', 'delivered', 'approved_by_client', 'cancelled'
    ) NOT NULL,
    
    -- Who changed the status
    changed_by_user_id INT, -- Could be patient, partner, rider, or admin
    changed_by_user_type EENUM('patients', 'partner_organizations', 'delivery_riders', 'super_administrators')  NOT NULL,
    
    notes TEXT, -- Reason for status change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    
    INDEX idx_order_history (order_id, created_at),
    INDEX idx_status_change (new_status, created_at)
);



-- 5. ORDER_ASSIGNMENT_LOG (Track delivery assignment attempts)
CREATE TABLE IF NOT EXISTS order_assignment_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    
    -- Assignment details
    assigned_rider_id INT,
    assignment_method ENUM('automatic', 'manual') NOT NULL,
    
    -- For automatic assignment - store calculation details
    nearby_riders_count INT DEFAULT 0,
    selected_rider_distance DECIMAL(8, 2), -- Distance in km/miles
    
    -- For manual assignment
    assigned_by_user_id INT, -- Partner admin who manually assigned
    assigned_by_user_type ENUM('partner_organizations', 'super_administrators') NOT NULL,
    
    assignment_status ENUM('offered', 'accepted', 'rejected', 'timeout') DEFAULT 'offered',
    rider_response_time INT, -- Seconds to respond (if applicable)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (assigned_rider_id) REFERENCES delivery_riders(rider_id),
    
    INDEX idx_order_assignment (order_id, created_at),
    INDEX idx_rider_assignments (assigned_rider_id, created_at)
);


-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for partner order dashboard
CREATE OR REPLACE VIEW partner_orders_view AS
SELECT 
    o.order_id,
    o.order_number,
    o.order_status,
    o.order_amount,
    o.created_at as order_placement_time,
    o.patient_contact,
    p.full_name as patient_name,
    po.facility_name as partner_organization_name,
    dr.username as delivery_rider_name,
    dr.phone_number as rider_contact,
    o.picked_up_at,
    o.delivered_at
FROM orders o
JOIN patients p ON o.patient_id = p.patient_id
JOIN partner_organizations po ON o.partner_org_id = po.partner_id
LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id;

-- View for super admin order dashboard
CREATE OR REPLACE VIEW admin_orders_view AS
SELECT 
    o.*,
    p.full_name as patient_full_name,
    po.facility_name as partner_org_name,
    dr.username,
    dr.phone_number as rider_phone,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
FROM orders o
JOIN patients p ON o.patient_id = p.patient_id
JOIN partner_organizations po ON o.partner_org_id = po.partner
LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id;

-- ============================================
-- STORED PROCEDURES (Optional but helpful)
-- ============================================

-- Procedure to update order status with history tracking
DELIMITER //
CREATE PROCEDURE update_order_status(
    IN p_order_id INT,
    IN p_new_status VARCHAR(50),
    IN p_changed_by_user_id INT,
    IN p_changed_by_user_type VARCHAR(20),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_old_status VARCHAR(50);
    
    -- Get current status
    SELECT order_status INTO v_old_status 
    FROM orders WHERE order_id = p_order_id;
    
    -- Update orders table
    UPDATE orders 
    SET order_status = p_new_status,
        -- Update specific timestamp based on status
        accepted_at = IF(p_new_status = 'accepted' AND accepted_at IS NULL, NOW(), accepted_at),
        assigned_at = IF(p_new_status = 'assigned' AND assigned_at IS NULL, NOW(), assigned_at),
        picked_up_at = IF(p_new_status = 'picked_up' AND picked_up_at IS NULL, NOW(), picked_up_at),
        in_transit_at = IF(p_new_status = 'in_transit' AND in_transit_at IS NULL, NOW(), in_transit_at),
        delivered_at = IF(p_new_status = 'delivered' AND delivered_at IS NULL, NOW(), delivered_at),
        approved_by_client_at = IF(p_new_status = 'approved_by_client' AND approved_by_client_at IS NULL, NOW(), approved_by_client_at),
        cancelled_at = IF(p_new_status = 'cancelled' AND cancelled_at IS NULL, NOW(), cancelled_at)
    WHERE order_id = p_order_id;
    
    -- Insert into history table
    INSERT INTO order_status_history (
        order_id, old_status, new_status, 
        changed_by_user_id, changed_by_user_type, notes
    ) VALUES (
        p_order_id, v_old_status, p_new_status,
        p_changed_by_user_id, p_changed_by_user_type, p_notes
    );
    
    -- Return success
    SELECT 1 as success, 'Status updated successfully' as message;
END//
DELIMITER ;


-- If not, create this improved trigger:
DELIMITER //
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    -- Generate order number: ORD-YYYY-NNNNN (5 digits)
    IF NEW.order_number IS NULL THEN
        -- Get current year
        SET @current_year = YEAR(NOW());
        
        -- Get the next sequence number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 9) AS UNSIGNED)), 0) + 1 
        INTO @next_number
        FROM orders 
        WHERE order_number LIKE CONCAT('ORD-', @current_year, '-%');
        
        -- Format with leading zeros (5 digits)
        SET NEW.order_number = CONCAT(
            'ORD-',
            @current_year,
            '-',
            LPAD(@next_number, 5, '0')
        );
    END IF;
END//
DELIMITER ;


-- Change all tables to same collation
ALTER TABLE orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE order_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE order_location_updates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE order_status_history CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE order_assignment_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

