CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(20) UNIQUE NOT NULL,
    
    -- Facility Info
    facility_name VARCHAR(100) NOT NULL,
    registration_number VARCHAR(50),
    year_established INT,
    number_of_beds INT,
    physical_address TEXT,
    city_town VARCHAR(100),
    district VARCHAR(100),
    facility_phone VARCHAR(20),
    facility_email VARCHAR(100),
    website VARCHAR(150),
    operating_hours TIME,
    closing_time TIME,
    is_24_7_operation BOOLEAN DEFAULT FALSE,
    facility_type VARCHAR(50) CHECK (facility_type IN (
        'Hospital', 'Clinic', 'Diagnostic Centre', 'Pharmacy', 
        'Specialist Center', 'Mentality Home', 'Dental Clinic', 'Optical Center'
    )),

    -- Contact Person
    contact_first_name VARCHAR(50),
    contact_last_name VARCHAR(50),
    job_title VARCHAR(100),
    department VARCHAR(100),
    personal_email VARCHAR(100),
    phone_number VARCHAR(20),
    alternative_phone VARCHAR(20),
    national_id_number VARCHAR(20),
    password TEXT,

    -- Services & Specializations
    cardiology BOOLEAN DEFAULT FALSE,
    orthopedics BOOLEAN DEFAULT FALSE,
    neurology BOOLEAN DEFAULT FALSE,
    dermatology BOOLEAN DEFAULT FALSE,
    ophthalmology BOOLEAN DEFAULT FALSE,
    ent BOOLEAN DEFAULT FALSE,
    dentistry BOOLEAN DEFAULT FALSE,
    radiology BOOLEAN DEFAULT FALSE,
    laboratory_services BOOLEAN DEFAULT FALSE,
    emergency_services BOOLEAN DEFAULT FALSE,
    pharmacy BOOLEAN DEFAULT FALSE,
    physiotherapy BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
