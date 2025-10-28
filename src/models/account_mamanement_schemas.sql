-- ========================================================================
-- Good Shepherd General Hospital - Accounts Management System
-- MySQL Database Schema
-- Created: October 28, 2025
-- ========================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS good_shepherd_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE good_shepherd_db;

-- ========================================================================
-- CORE USER TABLES
-- ========================================================================

-- Super Administrator Table
CREATE TABLE super_administrators (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(255),
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    account_locked_until TIMESTAMP NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- PARTNER TABLES (Hospitals & Medical Facilities)
-- ========================================================================

-- Partner Organizations Table
CREATE TABLE partner_organizations (
    partner_id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Organization Details
    organization_name VARCHAR(200) NOT NULL,
    organization_type ENUM('hospital', 'clinic', 'pharmacy', 'diagnostic_center', 'ambulance_service', 'other') NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    tax_id VARCHAR(100),
    
    -- Contact Information
    primary_email VARCHAR(100) UNIQUE NOT NULL,
    secondary_email VARCHAR(100),
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL DEFAULT 'Uganda',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Operating Hours
    operating_hours JSON, -- Store operating hours as JSON
    emergency_services_available BOOLEAN DEFAULT FALSE,
    
    -- Branding
    logo_url VARCHAR(255),
    banner_image_url VARCHAR(255),
    
    -- Business Details
    license_number VARCHAR(100),
    license_expiry_date DATE,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_expiry_date DATE,
    
    -- Financial
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    bank_account_name VARCHAR(100),
    bank_branch VARCHAR(100),
    swift_code VARCHAR(20),
    mobile_money_number VARCHAR(20),
    mobile_money_provider VARCHAR(50),
    
    -- Service Categories
    services_offered JSON, -- Array of services
    specializations JSON, -- Array of medical specializations
    
    -- Verification & Status
    verification_status ENUM('pending', 'under_review', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
    verification_date TIMESTAMP NULL,
    verified_by INT, -- Reference to admin_id
    rejection_reason TEXT,
    
    application_reference VARCHAR(50) UNIQUE,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP NULL,

    
    subscription_tier ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free',
    subscription_start_date DATE,
    subscription_end_date DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_organization_name (organization_name),
    INDEX idx_organization_type (organization_type),
    INDEX idx_verification_status (verification_status),
    INDEX idx_primary_email (primary_email),
    INDEX idx_is_active (is_active),
    INDEX idx_city (city),
    FOREIGN KEY (verified_by) REFERENCES super_administrators(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner User Accounts (Staff of partner organizations)
CREATE TABLE partner_users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    partner_id INT NOT NULL,
    
    -- Authentication
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Information
    full_name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    department VARCHAR(100),
    phone_number VARCHAR(20),
    
    -- Role & Permissions
    role ENUM('owner', 'admin', 'manager', 'staff', 'viewer') DEFAULT 'staff',
    permissions JSON, -- Specific permissions
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    account_locked_until TIMESTAMP NULL,
    
    -- Profile
    profile_picture_url VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(100),
    email_verified_at TIMESTAMP NULL,

    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT, -- Reference to admin_id or user_id who created this
    
    INDEX idx_partner_id (partner_id),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active),
    INDEX idx_role (role),
    FOREIGN KEY (partner_id) REFERENCES partner_organizations(partner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner Documents Table
CREATE TABLE partner_documents (
    document_id INT PRIMARY KEY AUTO_INCREMENT,
    partner_id INT NOT NULL,
    
    document_type ENUM('license', 'insurance', 'registration', 'tax_certificate', 'bank_statement', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    file_size_kb INT,
    mime_type VARCHAR(100),
    
    uploaded_by INT, -- user_id or admin_id
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    verified_by INT,
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_partner_id (partner_id),
    INDEX idx_document_type (document_type),
    INDEX idx_verification_status (verification_status),
    FOREIGN KEY (partner_id) REFERENCES partner_organizations(partner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- DELIVERY RIDERS & DRIVERS TABLES
-- ========================================================================

-- Delivery Riders Table
CREATE TABLE delivery_riders (
    rider_id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Authentication
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Information
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    national_id_number VARCHAR(50) UNIQUE,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Uganda',
    
    -- Profile
    profile_picture_url VARCHAR(255),
    bio TEXT,
    
    -- Vehicle Information
    vehicle_type ENUM('motorcycle', 'bicycle', 'car', 'van', 'ambulance', 'on_foot') NOT NULL,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INT,
    vehicle_color VARCHAR(50),
    license_plate VARCHAR(50) UNIQUE,
    vehicle_registration_number VARCHAR(100),
    vehicle_insurance_number VARCHAR(100),
    vehicle_insurance_expiry DATE,
    
    -- Driver License
    drivers_license_number VARCHAR(100) UNIQUE,
    drivers_license_expiry DATE,
    drivers_license_class VARCHAR(50),
    
    -- Bank Account
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    bank_account_name VARCHAR(100),
    mobile_money_number VARCHAR(20),
    mobile_money_provider VARCHAR(50),
    
    -- Work Status
    employment_type ENUM('full_time', 'part_time', 'contractor', 'freelance') DEFAULT 'contractor',
    availability_status ENUM('available', 'busy', 'offline', 'on_break') DEFAULT 'offline',
    current_zone VARCHAR(100),
    
    -- Performance Metrics
    total_deliveries INT DEFAULT 0,
    successful_deliveries INT DEFAULT 0,
    cancelled_deliveries INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Verification & Status
    verification_status ENUM('pending', 'under_review', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
    background_check_status ENUM('not_started', 'pending', 'passed', 'failed') DEFAULT 'not_started',
    background_check_date DATE,
    verified_by INT, -- admin_id
    verification_date TIMESTAMP NULL,
    
    -- Security
    last_login_at TIMESTAMP NULL,
    last_location_latitude DECIMAL(10, 8),
    last_location_longitude DECIMAL(11, 8),
    last_location_updated_at TIMESTAMP NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT, -- admin_id
    
    INDEX idx_username (username),
    INDEX idx_phone_number (phone_number),
    INDEX idx_email (email),
    INDEX idx_national_id (national_id_number),
    INDEX idx_verification_status (verification_status),
    INDEX idx_availability_status (availability_status),
    INDEX idx_is_active (is_active),
    INDEX idx_vehicle_type (vehicle_type),
    FOREIGN KEY (verified_by) REFERENCES super_administrators(admin_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES super_administrators(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rider Documents Table
CREATE TABLE rider_documents (
    document_id INT PRIMARY KEY AUTO_INCREMENT,
    rider_id INT NOT NULL,
    
    document_type ENUM(
        'national_id', 
        'drivers_license', 
        'vehicle_registration', 
        'vehicle_insurance', 
        'profile_photo',
        'background_check',
        'medical_certificate',
        'other'
    ) NOT NULL,
    
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    file_size_kb INT,
    mime_type VARCHAR(100),
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    verified_by INT, -- admin_id
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_rider_id (rider_id),
    INDEX idx_document_type (document_type),
    INDEX idx_verification_status (verification_status),
    FOREIGN KEY (rider_id) REFERENCES delivery_riders(rider_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rider Ratings & Reviews
CREATE TABLE rider_ratings (
    rating_id INT PRIMARY KEY AUTO_INCREMENT,
    rider_id INT NOT NULL,
    patient_id INT, -- Reference to patients table (below)
    order_id INT, -- Reference to orders table
    
    rating TINYINT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_rider_id (rider_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_rating (rating),
    FOREIGN KEY (rider_id) REFERENCES delivery_riders(rider_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- PATIENT TABLES (Mobile App Users)
-- ========================================================================

-- Patients Table
CREATE TABLE patients (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Authentication
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Information (from mobile app signup)
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    age INT,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'),
    
    -- Contact Information
    email VARCHAR(100),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Address/Location
    location_address VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Uganda',
    default_latitude DECIMAL(10, 8),
    default_longitude DECIMAL(11, 8),
    
    -- Profile
    profile_picture_url VARCHAR(255),
    
    -- Medical Information
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    medical_notes TEXT,
    
    -- Insurance Information
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_expiry_date DATE,
    
    -- App Preferences
    preferred_language ENUM('english', 'luganda', 'swahili') DEFAULT 'english',
    notification_preferences JSON,
    
    -- Security
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    device_tokens JSON, -- For push notifications
    
    -- Verification
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verification_code VARCHAR(10),
    phone_verified_at TIMESTAMP NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(100),
    email_verified_at TIMESTAMP NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    account_status ENUM('active', 'suspended', 'banned', 'deleted') DEFAULT 'active',
    
    -- Terms & Privacy
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP NULL,
    privacy_policy_accepted BOOLEAN DEFAULT FALSE,
    privacy_policy_accepted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_phone_number (phone_number),
    INDEX idx_email (email),
    INDEX idx_full_name (full_name),
    INDEX idx_is_active (is_active),
    INDEX idx_account_status (account_status),
    INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Medical Records
CREATE TABLE patient_medical_records (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    
    record_type ENUM('consultation', 'diagnosis', 'prescription', 'lab_result', 'imaging', 'vaccination', 'other') NOT NULL,
    record_date DATE NOT NULL,
    
    provider_id INT, -- partner_id
    provider_name VARCHAR(200),
    doctor_name VARCHAR(100),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    diagnosis TEXT,
    prescription TEXT,
    
    -- Document Attachment
    document_url VARCHAR(500),
    document_type VARCHAR(50),
    
    is_confidential BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_record_type (record_type),
    INDEX idx_record_date (record_date),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Saved Addresses
CREATE TABLE patient_addresses (
    address_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    
    address_type ENUM('home', 'work', 'other') DEFAULT 'home',
    address_label VARCHAR(100), -- e.g., "Home", "Mom's House"
    
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_is_default (is_default),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- AUTHENTICATION & SECURITY TABLES
-- ========================================================================

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    token_id INT PRIMARY KEY AUTO_INCREMENT,
    
    user_type ENUM('super_admin', 'partner_user', 'rider', 'patient') NOT NULL,
    user_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    
    token VARCHAR(255) UNIQUE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login Sessions
CREATE TABLE login_sessions (
    session_id INT PRIMARY KEY AUTO_INCREMENT,
    
    user_type ENUM('super_admin', 'partner_user', 'rider', 'patient') NOT NULL,
    user_id INT NOT NULL,
    
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    device_type VARCHAR(50), -- mobile, desktop, tablet
    device_os VARCHAR(50),
    browser VARCHAR(50),
    
    location_city VARCHAR(100),
    location_country VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_session_token (session_token),
    INDEX idx_user_type_id (user_type, user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log
CREATE TABLE audit_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    user_type ENUM('super_admin', 'partner_user', 'rider', 'patient', 'system') NOT NULL,
    user_id INT,
    username VARCHAR(100),
    
    action VARCHAR(100) NOT NULL, -- e.g., 'login', 'logout', 'create_user', 'update_profile'
    entity_type VARCHAR(100), -- e.g., 'partner', 'rider', 'patient'
    entity_id INT,
    
    description TEXT,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Store changes as JSON
    old_values JSON,
    new_values JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_type_id (user_type, user_id),
    INDEX idx_action (action),
    INDEX idx_entity_type_id (entity_type, entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- NOTIFICATION TABLES
-- ========================================================================

-- Notifications
CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    user_type ENUM('super_admin', 'partner_user', 'rider', 'patient') NOT NULL,
    user_id INT NOT NULL,
    
    notification_type ENUM(
        'account', 'order', 'delivery', 'payment', 
        'promotion', 'system', 'verification', 'alert'
    ) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    action_url VARCHAR(500),
    action_button_text VARCHAR(50),
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    INDEX idx_user_type_id (user_type, user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_notification_type (notification_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- SYSTEM CONFIGURATION TABLES
-- ========================================================================

-- System Settings
CREATE TABLE system_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by non-admin users
    
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- VIEWS FOR EASY QUERYING
-- ========================================================================

-- View: Active Partners Summary
CREATE VIEW v_active_partners AS
SELECT 
    po.partner_id,
    po.organization_name,
    po.organization_type,
    po.primary_email,
    po.primary_phone,
    po.city,
    po.verification_status,
    po.subscription_tier,
    po.is_active,
    COUNT(DISTINCT pu.user_id) as user_count,
    po.created_at
FROM partner_organizations po
LEFT JOIN partner_users pu ON po.partner_id = pu.partner_id AND pu.is_active = TRUE
WHERE po.is_active = TRUE
GROUP BY po.partner_id;

-- View: Active Riders Summary
CREATE VIEW v_active_riders AS
SELECT 
    rider_id,
    full_name,
    phone_number,
    email,
    vehicle_type,
    availability_status,
    verification_status,
    total_deliveries,
    successful_deliveries,
    average_rating,
    city,
    is_active,
    created_at
FROM delivery_riders
WHERE is_active = TRUE AND verification_status = 'verified';

-- View: Patient Statistics
CREATE VIEW v_patient_statistics AS
SELECT 
    patient_id,
    full_name,
    phone_number,
    email,
    age,
    gender,
    city,
    phone_verified,
    account_status,
    created_at,
    last_login_at
FROM patients
WHERE is_active = TRUE;

-- ========================================================================
-- INITIAL DATA
-- ========================================================================

-- Insert default super admin (password: Admin@123456)
-- Note: In production, hash the password properly
INSERT INTO super_administrators (username, email, password_hash, full_name, phone_number)
VALUES 
    ('superadmin', 'admin@goodshepherd.health', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+256700000000');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
    ('app_name', 'Good Shepherd General Hospital', 'string', 'Application name', TRUE),
    ('app_version', '1.0.0', 'string', 'Current application version', TRUE),
    ('emergency_hotline', '+256 393 101 919', 'string', 'Emergency services phone number', TRUE),
    ('support_email', 'support@goodshepherd.health', 'string', 'Customer support email', TRUE),
    ('partner_support_email', 'partners@goodshepherd.health', 'string', 'Partner support email', TRUE),
    ('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode', FALSE),
    ('registration_enabled', 'true', 'boolean', 'Enable/disable new registrations', FALSE),
    ('max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before account lock', FALSE),
    ('session_timeout_minutes', '60', 'number', 'Session timeout in minutes', FALSE),
    ('password_min_length', '8', 'number', 'Minimum password length', FALSE);

-- ========================================================================
-- TRIGGERS
-- ========================================================================

-- Trigger: Update partner user count
DELIMITER //
CREATE TRIGGER after_partner_user_insert
AFTER INSERT ON partner_users
FOR EACH ROW
BEGIN
    -- You can add logic here to update summary tables
    INSERT INTO audit_log (user_type, user_id, action, entity_type, entity_id, description)
    VALUES ('system', NULL, 'user_created', 'partner_user', NEW.user_id, CONCAT('Partner user created: ', NEW.full_name));
END//

-- Trigger: Log rider creation
CREATE TRIGGER after_rider_insert
AFTER INSERT ON delivery_riders
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user_type, user_id, action, entity_type, entity_id, description)
    VALUES ('super_admin', NEW.created_by, 'rider_created', 'rider', NEW.rider_id, CONCAT('Delivery rider created: ', NEW.full_name));
END//

-- Trigger: Log patient registration
CREATE TRIGGER after_patient_insert
AFTER INSERT ON patients
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user_type, user_id, action, entity_type, entity_id, description)
    VALUES ('patient', NEW.patient_id, 'patient_registered', 'patient', NEW.patient_id, CONCAT('Patient registered: ', NEW.full_name));
END//

DELIMITER ;

-- ========================================================================
-- STORED PROCEDURES
-- ========================================================================

-- Procedure: Get user by email (works across all user types)
DELIMITER //
CREATE PROCEDURE sp_get_user_by_email(IN p_email VARCHAR(100))
BEGIN
    -- Check super admin
    SELECT 'super_admin' as user_type, admin_id as id, email, password_hash, full_name, is_active
    FROM super_administrators
    WHERE email = p_email
    
    UNION ALL
    
    -- Check partner users
    SELECT 'partner_user' as user_type, user_id as id, email, password_hash, full_name, is_active
    FROM partner_users
    WHERE email = p_email
    
    UNION ALL
    
    -- Check riders
    SELECT 'rider' as user_type, rider_id as id, email, password_hash, full_name, is_active
    FROM delivery_riders
    WHERE email = p_email
    
    UNION ALL
    
    -- Check patients
    SELECT 'patient' as user_type, patient_id as id, email, password_hash, full_name, is_active
    FROM patients
    WHERE email = p_email;
END//

-- Procedure: Update login timestamp
CREATE PROCEDURE sp_update_last_login(
    IN p_user_type VARCHAR(20),
    IN p_user_id INT,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    IF p_user_type = 'super_admin' THEN
        UPDATE super_administrators 
        SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = p_ip_address, failed_login_attempts = 0
        WHERE admin_id = p_user_id;
    ELSEIF p_user_type = 'partner_user' THEN
        UPDATE partner_users 
        SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = p_ip_address, failed_login_attempts = 0
        WHERE user_id = p_user_id;
    ELSEIF p_user_type = 'rider' THEN
        UPDATE delivery_riders 
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE rider_id = p_user_id;
    ELSEIF p_user_type = 'patient' THEN
        UPDATE patients 
        SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = p_ip_address
        WHERE patient_id = p_user_id;
    END IF;
END//

DELIMITER ;

-- ========================================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_partner_status_active ON partner_organizations(verification_status, is_active);
CREATE INDEX idx_rider_status_availability ON delivery_riders(verification_status, availability_status, is_active);
CREATE INDEX idx_patient_phone_active ON patients(phone_number, is_active);
CREATE INDEX idx_notifications_user_unread ON notifications(user_type, user_id, is_read, created_at);

-- ========================================================================
-- GRANT PRIVILEGES (adjust as needed for your environment)
-- ========================================================================
-- Note: Create specific database users with limited privileges in production
-- GRANT SELECT, INSERT, UPDATE, DELETE ON good_shepherd_db.* TO 'app_user'@'localhost';
-- FLUSH PRIVILEGES;

-- ========================================================================
-- END OF SCHEMA
-- ========================================================================

SELECT 'Database schema created successfully!' as Status;