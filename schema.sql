CREATE DATABASE IF NOT EXISTS turnoclinic;
USE turnoclinic;

CREATE TABLE Especialidad (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre_especialidad VARCHAR(100) NOT NULL,
    icono VARCHAR(50)
);

CREATE TABLE Obra_Social (
    id_obra_social INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE Rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL
);

CREATE TABLE Profesional (
    id_profesional INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    celular VARCHAR(50),
    correo VARCHAR(100),
    id_especialidad INT NOT NULL,
    FOREIGN KEY (id_especialidad) REFERENCES Especialidad(id_especialidad)
);

CREATE TABLE Paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    celular VARCHAR(50),
    email VARCHAR(100),
    id_obra_social INT NOT NULL,
    FOREIGN KEY (id_obra_social) REFERENCES Obra_Social(id_obra_social)
);

CREATE TABLE Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    id_profesional INT DEFAULT NULL,
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol),
    FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional) ON DELETE CASCADE
);

-- Nivel 3: Agenda cumpliendo 1FN
CREATE TABLE Agenda (
    id_agenda INT AUTO_INCREMENT PRIMARY KEY,
    id_profesional INT NOT NULL,
    fecha_atencion DATE NOT NULL,
    FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
);

CREATE TABLE Agenda_Horario_Dia (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_agenda INT NOT NULL,
    hora TIME NOT NULL,
    FOREIGN KEY (id_agenda) REFERENCES Agenda(id_agenda)
);

-- Nivel 4: Transaccional Core con Auditoría e Historial
CREATE TABLE Turno (
    id_turno INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado ENUM('pendiente', 'confirmado', 'cancelado', 'ausente', 'modificado') DEFAULT 'confirmado',
    id_paciente INT NOT NULL,
    id_profesional INT NOT NULL,
    id_obra_social INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
    FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
    FOREIGN KEY (id_obra_social) REFERENCES Obra_Social(id_obra_social),
    
    -- Restricción Crítica: prevenir superposición de horarios a nivel motor de BD
    UNIQUE (id_profesional, fecha, hora)
);

