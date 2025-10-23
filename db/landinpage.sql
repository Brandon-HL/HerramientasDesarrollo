CREATE DATABASE landingpage_db;
USE landingpage_db;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol ENUM('usuario', 'admin') DEFAULT 'usuario',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inscripciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    mensaje TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    plan ENUM('Básico', 'Intermedio', 'Avanzado') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE metricas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50),
    valor INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

USE landingpage_db;

INSERT INTO usuarios (nombre, correo, contrasena) VALUES ('Admin Demo','admin@demo.com','$2a$10$CwTycUXWue0Thq9StjUM0u'); -- contrasena bcrypt demo (no real)
INSERT INTO inscripciones (nombre, correo, telefono, mensaje, fecha) VALUES
('Carlos Ruiz','carlos@example.com','987654321','Quiero más info', DATE_SUB(NOW(), INTERVAL 10 DAY)),
('Ana Torres','ana@example.com','956123456','Interesado en plan intermedio', DATE_SUB(NOW(), INTERVAL 40 DAY)),
('María P.','maria@example.com','999888777','¿Hay descuentos?', DATE_SUB(NOW(), INTERVAL 70 DAY));

Select * from inscripciones 