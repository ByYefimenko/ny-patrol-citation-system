CREATE DATABASE ny_patrol_traffic_db;
USE ny_patrol_traffic_db;

-- TABLE CREATION

-- This is Person table, stores information about people
CREATE TABLE Person (
    person_id INT AUTO_INCREMENT PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    address_line VARCHAR(100),
    city VARCHAR(50),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    birth_date DATE,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    eye_colour VARCHAR(20),
    INDEX idx_last_name (last_name),
    INDEX idx_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DriverLicense table - one licence for each person
CREATE TABLE DriverLicense (
    licence_no VARCHAR(20) PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    person_id INT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES Person(person_id) ON DELETE CASCADE,
    INDEX idx_person_id (person_id),
    INDEX idx_state (state),
    INDEX idx_expiry_date (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vehicle table - stores cars and trucks information
CREATE TABLE Vehicle (
    vin VARCHAR(17) PRIMARY KEY,
    plate_no VARCHAR(10) NOT NULL,
    plate_state VARCHAR(2) NOT NULL,
    colour VARCHAR(30),
    make VARCHAR(50),
    model VARCHAR(50),
    vehicle_year INT,
    vehicle_type VARCHAR(30),
    registered_owner_person_id INT NOT NULL,
    registered_address VARCHAR(100),
    FOREIGN KEY (registered_owner_person_id) REFERENCES Person(person_id) ON DELETE RESTRICT,
    INDEX idx_plate_no (plate_no, plate_state),
    INDEX idx_owner (registered_owner_person_id),
    INDEX idx_make_model (make, model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- District table - different police districts
CREATE TABLE District (
    district_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Detachment table - each district has many detachments
CREATE TABLE Detachment (
    detachment_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    district_id INT NOT NULL,
    FOREIGN KEY (district_id) REFERENCES District(district_id) ON DELETE RESTRICT,
    INDEX idx_district_id (district_id),
    INDEX idx_code (code),
    UNIQUE KEY unique_code_district (code, district_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Officer table - police officers that work in detachments
CREATE TABLE Officer (
    officer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    badge_no VARCHAR(20) NOT NULL,
    district_id INT NOT NULL,
    detachment_id INT NOT NULL,
    FOREIGN KEY (district_id) REFERENCES District(district_id) ON DELETE RESTRICT,
    FOREIGN KEY (detachment_id) REFERENCES Detachment(detachment_id) ON DELETE RESTRICT,
    INDEX idx_district_id (district_id),
    INDEX idx_detachment_id (detachment_id),
    INDEX idx_badge_no (badge_no),
    INDEX idx_officer_name (last_name, first_name),
    UNIQUE KEY unique_badge (badge_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Location table - where violations happened
CREATE TABLE Location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(200),
    road VARCHAR(100),
    mile_marker DECIMAL(8,2),
    city VARCHAR(50),
    state VARCHAR(2),
    INDEX idx_road (road),
    INDEX idx_city_state (city, state),
    INDEX idx_mile_marker (mile_marker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ViolationType table - different types of traffic violations
CREATE TABLE ViolationType (
    violation_code VARCHAR(20) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    INDEX idx_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notice table - this is main table for traffic tickets
CREATE TABLE Notice (
    notice_uid INT AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(20) NOT NULL,
    notice_timestamp DATETIME NOT NULL,
    notes TEXT,
    is_warning BOOLEAN DEFAULT FALSE,
    officer_signature VARCHAR(100),
    driver_signature VARCHAR(100),
    officer_id INT NOT NULL,
    licence_no VARCHAR(20) NOT NULL,
    vin VARCHAR(17) NOT NULL,
    location_id INT NOT NULL,
    district_id INT NOT NULL,
    detachment_id INT NOT NULL,
    FOREIGN KEY (officer_id) REFERENCES Officer(officer_id) ON DELETE RESTRICT,
    FOREIGN KEY (licence_no) REFERENCES DriverLicense(licence_no) ON DELETE RESTRICT,
    FOREIGN KEY (vin) REFERENCES Vehicle(vin) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES Location(location_id) ON DELETE RESTRICT,
    FOREIGN KEY (district_id) REFERENCES District(district_id) ON DELETE RESTRICT,
    FOREIGN KEY (detachment_id) REFERENCES Detachment(detachment_id) ON DELETE RESTRICT,
    INDEX idx_ticket_no (ticket_no),
    INDEX idx_officer_id (officer_id),
    INDEX idx_licence_no (licence_no),
    INDEX idx_vin (vin),
    INDEX idx_location_id (location_id),
    INDEX idx_district_id (district_id),
    INDEX idx_detachment_id (detachment_id),
    INDEX idx_notice_timestamp (notice_timestamp),
    INDEX idx_is_warning (is_warning),
    UNIQUE KEY unique_ticket_no (ticket_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NoticeViolation table - one notice can have many violations
CREATE TABLE NoticeViolation (
    notice_uid INT NOT NULL,
    violation_code VARCHAR(20) NOT NULL,
    narrative TEXT,
    PRIMARY KEY (notice_uid, violation_code),
    FOREIGN KEY (notice_uid) REFERENCES Notice(notice_uid) ON DELETE CASCADE,
    FOREIGN KEY (violation_code) REFERENCES ViolationType(violation_code) ON DELETE RESTRICT,
    INDEX idx_violation_code (violation_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- UserAccount table - for login to system
CREATE TABLE UserAccount (
    username VARCHAR(50) PRIMARY KEY,
    role VARCHAR(30) NOT NULL,
    person_id INT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES Person(person_id) ON DELETE CASCADE,
    INDEX idx_person_id (person_id),
    INDEX idx_role (role),
    UNIQUE KEY unique_person_account (person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SAMPLE DATA INSERTION

-- Insert some persons for testing
INSERT INTO Person (last_name, first_name, address_line, city, state, zip_code, birth_date, height, weight, eye_colour) VALUES
('Smith', 'John', '123 Main Street', 'Albany', 'NY', '12201', '1985-03-15', 70.5, 180.0, 'Brown'),
('Johnson', 'Sarah', '456 Oak Avenue', 'Buffalo', 'NY', '14201', '1990-07-22', 65.0, 140.0, 'Blue'),
('Williams', 'Michael', '789 Elm Road', 'Rochester', 'NY', '14604', '1988-11-08', 72.0, 195.0, 'Green'),
('Brown', 'Emily', '321 Pine Street', 'Syracuse', 'NY', '13201', '1992-05-30', 64.5, 135.0, 'Hazel'),
('Davis', 'Robert', '654 Maple Drive', 'Yonkers', 'NY', '10701', '1983-09-12', 71.0, 185.0, 'Brown');

-- Insert driver licences for persons
INSERT INTO DriverLicense (licence_no, state, issue_date, expiry_date, person_id) VALUES
('DL123456789', 'NY', '2020-01-15', '2025-01-15', 1),
('DL987654321', 'NY', '2019-06-10', '2024-06-10', 2),
('DL456789123', 'NY', '2021-03-20', '2026-03-20', 3),
('DL789123456', 'NY', '2020-11-05', '2025-11-05', 4),
('DL321654987', 'NY', '2018-08-18', '2023-08-18', 5);

-- Insert vehicles, each person can own many vehicles
INSERT INTO Vehicle (vin, plate_no, plate_state, colour, make, model, vehicle_year, vehicle_type, registered_owner_person_id, registered_address) VALUES
('1HGBH41JXMN109186', 'ABC1234', 'NY', 'Blue', 'Honda', 'Civic', 2020, 'Sedan', 1, '123 Main Street, Albany, NY 12201'),
('2FMDK3GC5EBA12345', 'XYZ5678', 'NY', 'Red', 'Ford', 'F-150', 2019, 'Truck', 2, '456 Oak Avenue, Buffalo, NY 14201'),
('3VW2B7AJ5HM123456', 'DEF9012', 'NY', 'White', 'Toyota', 'Camry', 2021, 'Sedan', 3, '789 Elm Road, Rochester, NY 14604'),
('4T1BF1FK5EU234567', 'GHI3456', 'NY', 'Black', 'Nissan', 'Altima', 2020, 'Sedan', 4, '321 Pine Street, Syracuse, NY 13201'),
('5YJ3E1EB5KF345678', 'JKL7890', 'NY', 'Silver', 'Chevrolet', 'Silverado', 2018, 'Truck', 5, '654 Maple Drive, Yonkers, NY 10701'),
('1HGCM82633A123456', 'MNO2468', 'NY', 'Green', 'Honda', 'Accord', 2022, 'Sedan', 1, '123 Main Street, Albany, NY 12201');

-- Insert districts data
INSERT INTO District (name) VALUES
('Capital District'),
('Western New York'),
('Central New York'),
('Hudson Valley'),
('Long Island');

-- Insert detachments, they belong to districts
INSERT INTO Detachment (code, name, district_id) VALUES
('CAP-001', 'Albany Troop G', 1),
('CAP-002', 'Schenectady Troop G', 1),
('WNY-001', 'Buffalo Troop A', 2),
('WNY-002', 'Rochester Troop E', 2),
('CNY-001', 'Syracuse Troop D', 3),
('HV-001', 'Yonkers Troop F', 4);

-- Insert officers, they work in detachments
INSERT INTO Officer (first_name, last_name, badge_no, district_id, detachment_id) VALUES
('James', 'Anderson', 'BG-1234', 1, 1),
('Patricia', 'Martinez', 'BG-1235', 1, 1),
('David', 'Thompson', 'BG-2345', 2, 3),
('Jennifer', 'White', 'BG-2346', 2, 4),
('Christopher', 'Harris', 'BG-3456', 3, 5),
('Lisa', 'Clark', 'BG-3457', 3, 5),
('Daniel', 'Lewis', 'BG-4567', 4, 6);

-- Insert locations where violations happened
INSERT INTO Location (description, road, mile_marker, city, state) VALUES
('I-87 Northbound near Exit 5', 'I-87', 125.5, 'Albany', 'NY'),
('Route 90 Westbound, mile marker 420', 'I-90', 420.0, 'Buffalo', 'NY'),
('Route 490 Eastbound, Exit 15', 'I-490', 45.2, 'Rochester', 'NY'),
('Route 81 Southbound, mile marker 12', 'I-81', 12.0, 'Syracuse', 'NY'),
('Route 87 Southbound, near Tappan Zee Bridge', 'I-87', 12.3, 'Yonkers', 'NY'),
('Route 90 Eastbound, mile marker 200', 'I-90', 200.0, 'Albany', 'NY');

-- Insert violation types - different kinds of violations
INSERT INTO ViolationType (violation_code, description) VALUES
('SPEED-01', 'Exceeding posted speed limit by 1-10 mph'),
('SPEED-02', 'Exceeding posted speed limit by 11-20 mph'),
('SPEED-03', 'Exceeding posted speed limit by 21+ mph'),
('RED-LIGHT', 'Failure to stop at red light'),
('STOP-SIGN', 'Failure to stop at stop sign'),
('SEATBELT', 'Failure to wear seatbelt'),
('CELL-PHONE', 'Use of mobile device while driving'),
('LANE-CHANGE', 'Improper lane change'),
('TAILGATING', 'Following too closely'),
('DUI', 'Driving under the influence');

-- Insert notices - actual traffic tickets
INSERT INTO Notice (ticket_no, notice_timestamp, notes, is_warning, officer_signature, driver_signature, officer_id, licence_no, vin, location_id, district_id, detachment_id) VALUES
('TCN-2024-0001', '2024-01-15 14:30:00', 'Driver was cooperative', FALSE, 'J. Anderson', 'John Smith', 1, 'DL123456789', '1HGBH41JXMN109186', 1, 1, 1),
('TCN-2024-0002', '2024-01-20 09:15:00', 'First time offense', TRUE, 'P. Martinez', 'Sarah Johnson', 2, 'DL987654321', '2FMDK3GC5EBA12345', 2, 1, 1),
('TCN-2024-0003', '2024-02-05 16:45:00', 'Heavy traffic conditions', FALSE, 'D. Thompson', 'Michael Williams', 3, 'DL456789123', '3VW2B7AJ5HM123456', 3, 2, 3),
('TCN-2024-0004', '2024-02-10 11:20:00', 'Weather conditions: rain', FALSE, 'J. White', 'Emily Brown', 4, 'DL789123456', '4T1BF1FK5EU234567', 4, 2, 4),
('TCN-2024-0005', '2024-02-18 13:00:00', 'Driver requested court hearing', FALSE, 'C. Harris', 'Robert Davis', 5, 'DL321654987', '5YJ3E1EB5KF345678', 5, 3, 5),
('TCN-2024-0006', '2024-03-01 08:30:00', 'School zone violation', FALSE, 'L. Clark', 'John Smith', 6, 'DL123456789', '1HGCM82633A123456', 6, 3, 5),
('TCN-2024-0007', '2024-03-05 15:45:00', 'Construction zone', FALSE, 'D. Lewis', 'Sarah Johnson', 7, 'DL987654321', '2FMDK3GC5EBA12345', 2, 4, 6);

-- Insert notice violations - what violations are in each notice
INSERT INTO NoticeViolation (notice_uid, violation_code, narrative) VALUES
(1, 'SPEED-02', 'Vehicle was traveling 75 mph in a 55 mph zone'),
(1, 'LANE-CHANGE', 'Changed lanes without signaling'),
(2, 'CELL-PHONE', 'Driver was observed using mobile phone while driving'),
(3, 'SPEED-03', 'Vehicle was traveling 90 mph in a 65 mph zone'),
(3, 'TAILGATING', 'Following vehicle ahead too closely'),
(4, 'RED-LIGHT', 'Failed to stop at red light at intersection of Main and Oak'),
(5, 'STOP-SIGN', 'Rolled through stop sign without coming to complete stop'),
(6, 'SPEED-01', 'Vehicle was traveling 62 mph in a 55 mph zone'),
(7, 'SEATBELT', 'Driver was not wearing seatbelt when vehicle was stopped');

-- Insert user accounts for login
INSERT INTO UserAccount (username, role, person_id) VALUES
('jsmith', 'officer', 1),
('sjohnson', 'admin', 2),
('mwilliams', 'officer', 3),
('ebrown', 'viewer', 4),
('rdavis', 'officer', 5);