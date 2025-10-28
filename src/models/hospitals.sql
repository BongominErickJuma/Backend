CREATE TABLE hospitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id VARCHAR(20) UNIQUE,

  -- Facility Info
  facility_type ENUM('Hospital', 'Clinic', 'Diagnostic Centre', 'Pharmacy', 
                     'Specialist Center', 'Mentality Home', 'Dental Clinic', 'Optical Center'),
  facility_name VARCHAR(100) NOT NULL,
  registration_number VARCHAR(100),
  year_established YEAR,
  number_of_beds INT,
  physical_address VARCHAR(255),
  city_town VARCHAR(100),
  district VARCHAR(100),
  region VARCHAR(100) DEFAULT 'Central',
  facility_phone VARCHAR(20),
  facility_email VARCHAR(100),
  website VARCHAR(255),
  opening_hrs TIME,
  closing_hrs TIME,
  is_24_7_operation BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_inactive BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,

  -- Contact person as a JSON object
  contact_person JSON,

  -- Services & Specializations
  medical_services JSON,
  diagnostic_equipment JSON,
  number_of_doctors INT,
  number_of_nurses INT,
  number_of_ambulances INT,
  ambulance_services BOOLEAN DEFAULT FALSE,
  insurance_companies JSON,
  brief_description TEXT,

  -- Verification Files
  verification_files JSON,

  -- Terms & Conditions
  has_agreed_terms_and_conditions BOOLEAN DEFAULT FALSE,
  has_given_accurate_information BOOLEAN DEFAULT FALSE,
  has_allowed_verification BOOLEAN DEFAULT FALSE,
  has_agreed_communication BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELIMITER //

CREATE TRIGGER before_hospital_insert
BEFORE INSERT ON hospitals
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    SELECT IFNULL(MAX(id), 0) + 1 INTO next_id FROM hospitals;
    SET NEW.hospital_id = CONCAT('HSP-', LPAD(next_id, 4, '0'));
END;
//

DELIMITER ;
