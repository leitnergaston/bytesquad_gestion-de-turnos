USE turnoclinic;

-- 1. Obra Social
INSERT INTO Obra_Social (nombre) VALUES
('Particular'), ('OSDE'), ('Swiss Medical'), ('OSEP'), ('Galeno'), ('Medifé'), ('PAMI');

-- 2. Especialidad
INSERT INTO Especialidad (nombre_especialidad, icono) VALUES
('Cardiología', '🩺'), ('Dermatología', '🧴'), ('Kinesiología', '💪'),
('Nutrición', '🥗'), ('Odontología', '🦷'), ('Pediatría', '🧸');

-- 3. Rol
INSERT INTO Rol (nombre_rol) VALUES
('Administrador'), ('Secretaria'), ('Medico');

-- 4. Usuario Admin (pass: 123)
INSERT INTO Usuario_Admin (username, password, id_rol) VALUES
('admin', '123', 1);

-- 5. Profesionales (de prueba)
INSERT INTO Profesional (dni, nombre, apellido, celular, correo, id_especialidad) VALUES
('20111222', 'Ana', 'García', '11223344', 'ana.garcia@turnoclinic.com', 1),
('24333444', 'Carlos', 'Martínez', '22334455', 'carlos.m@turnoclinic.com', 3),
('28555666', 'Martín', 'Abad', '33445566', 'martin.abad@turnoclinic.com', 1);

-- 6. Pacientes (de prueba)
INSERT INTO Paciente (dni, nombre, apellido, celular, email, id_obra_social) VALUES
('30123456', 'Juana', 'Perez', '1155551234', 'juana.p@email.com', 2),
('32987654', 'Marcos', 'Gomez', '1155555678', 'marcos.g@email.com', 3);
