import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Configuración de base de datos MySQL (para uso local con Workbench)
  let db;
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root", // Cambia esto en tu local
      password: process.env.DB_PASSWORD || "root", // Cambia esto 
      database: process.env.DB_NAME || "turnoclinic",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log("Conexión MySQL configurada.");

    // DB Migrations for new features
    try {
      await db.query(`
          CREATE TABLE IF NOT EXISTS Secretaria (
              id_secretaria INT AUTO_INCREMENT PRIMARY KEY,
              dni VARCHAR(20) UNIQUE NOT NULL,
              nombre VARCHAR(100) NOT NULL,
              apellido VARCHAR(100) NOT NULL,
              estado ENUM('activo', 'inactivo') DEFAULT 'activo'
          );
      `);
      await db.query("ALTER TABLE Usuario ADD COLUMN id_secretaria INT DEFAULT NULL;");
      await db.query("ALTER TABLE Usuario ADD FOREIGN KEY (id_secretaria) REFERENCES Secretaria(id_secretaria) ON DELETE CASCADE;");
    } catch(e) {}

    // Auto-Migración y Configuración del esquema de la Base de Datos al iniciar
    setTimeout(async () => {
      try {
        const connCheck = await db.getConnection();
        console.log("Chequeando y ejecutando migraciones necesarias...");
        try {
          // Crear tabla Rol si no existe
          await connCheck.query(`
            CREATE TABLE IF NOT EXISTS Rol (
                id_rol INT AUTO_INCREMENT PRIMARY KEY,
                nombre_rol VARCHAR(50) NOT NULL
            )
          `);

          // Crear la tabla Usuario
          await connCheck.query(`
            CREATE TABLE IF NOT EXISTS Usuario (
                id_usuario INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                id_rol INT NOT NULL,
                id_profesional INT DEFAULT NULL,
                id_paciente INT DEFAULT NULL,
                FOREIGN KEY (id_rol) REFERENCES Rol(id_rol),
                FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional) ON DELETE CASCADE,
                FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente) ON DELETE CASCADE
            )
          `);

          // Verificar si ya existía la tabla Usuario pero sin la columna id_profesional o id_paciente
          const [columnsProf] = await connCheck.query("SHOW COLUMNS FROM Usuario LIKE 'id_profesional'");
          if (columnsProf.length === 0) {
            console.log("La tabla Usuario existe pero no tiene 'id_profesional'. Agregando columna...");
            await connCheck.query("ALTER TABLE Usuario ADD COLUMN id_profesional INT DEFAULT NULL");
            try {
              await connCheck.query("ALTER TABLE Usuario ADD FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional) ON DELETE CASCADE");
            } catch (fkErr) {
              console.log("Nota al agregar FK de id_profesional: ", fkErr.message);
            }
          }

          const [columnsPac] = await connCheck.query("SHOW COLUMNS FROM Usuario LIKE 'id_paciente'");
          if (columnsPac.length === 0) {
            console.log("La tabla Usuario existe pero no tiene 'id_paciente'. Agregando columna...");
            await connCheck.query("ALTER TABLE Usuario ADD COLUMN id_paciente INT DEFAULT NULL");
            try {
              await connCheck.query("ALTER TABLE Usuario ADD FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente) ON DELETE CASCADE");
            } catch (fkErr) {
              console.log("Nota al agregar FK de id_paciente: ", fkErr.message);
            }
          }

          // Asegurar que exista al menos una Obra Social (Particular)
          await connCheck.query("INSERT IGNORE INTO Obra_Social (id_obra_social, nombre) VALUES (1, 'Particular')");

          // Asegurar que el seed de roles esté completo
          await connCheck.query("INSERT IGNORE INTO Rol (id_rol, nombre_rol) VALUES (1, 'Administrador'), (2, 'Secretaria'), (3, 'Profesional'), (4, 'Paciente')");
          // Renombrar 'Medico' a 'Profesional' si existía
          await connCheck.query("UPDATE Rol SET nombre_rol = 'Profesional' WHERE id_rol = 3");

          // Aseguramos usuarios por defecto
          await connCheck.query("INSERT IGNORE INTO Usuario (username, password, id_rol) VALUES ('admin', '123', 1)");
          await connCheck.query("INSERT IGNORE INTO Usuario (username, password, id_rol) VALUES ('secre', '123', 2)");

          // Asociar el primero profesional disponible si existe
          const [profs] = await connCheck.query("SELECT id_profesional FROM Profesional ORDER BY id_profesional LIMIT 1");
          if (profs.length > 0) {
            const id_prof = profs[0].id_profesional;
            await connCheck.query("INSERT IGNORE INTO Usuario (username, password, id_rol, id_profesional) VALUES ('medico', '123', 3, ?)", [id_prof]);
          } else {
            await connCheck.query("INSERT IGNORE INTO Usuario (username, password, id_rol) VALUES ('medico', '123', 3)");
          }

          // Asegurar que el ENUM de estado en Turno incluya 'modificado'
          try {
            await connCheck.query(`
              ALTER TABLE Turno MODIFY COLUMN estado ENUM('pendiente', 'confirmado', 'cancelado', 'ausente', 'modificado') DEFAULT 'confirmado'
            `);
            console.log("Columna Turno.estado modificada para incluir 'modificado'.");
          } catch (alterErr) {
            console.log("Nota al alterar la columna Turno.estado: ", alterErr.message);
          }

          // Eliminar columna motivo_consulta si existe
          const [turnoCols] = await connCheck.query("SHOW COLUMNS FROM Turno LIKE 'motivo_consulta'");
          if (turnoCols.length > 0) {
            console.log("Eliminando columna 'motivo_consulta' de Turno...");
            try {
              await connCheck.query("ALTER TABLE Turno DROP COLUMN motivo_consulta");
            } catch (dropErr) {
              console.log("Nota al eliminar motivo_consulta: ", dropErr.message);
            }
          }

          console.log("Auto-migración completada con éxito.");
        } catch (migrError) {
          console.error("Error ejecutando migración de base de datos:", migrError);
        } finally {
          connCheck.release();
        }
      } catch (err) {
        console.error("No se pudo obtener conexión para migraciones:", err);
      }
    }, 1000);

  } catch (err) {
    console.error("Error MySQL:", err);
  }

  // ============================================
  // ESPECIALIDADES
  // ============================================
  app.get("/api/especialidades", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM Especialidad ORDER BY nombre_especialidad");
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PROFESIONALES
  // ============================================
  app.get("/api/profesionales", async (req, res) => {
    try {
      const query = `
        SELECT p.*, e.nombre_especialidad 
        FROM Profesional p 
        LEFT JOIN Especialidad e ON p.id_especialidad = e.id_especialidad
        ORDER BY p.nombre, p.apellido
      `;
      const [rows] = await db.query(query);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/profesionales", async (req, res) => {
    try {
      const { dni, nombre, apellido, celular, correo, id_especialidad } = req.body;
      const [result] = await db.query(
        "INSERT INTO Profesional (dni, nombre, apellido, celular, correo, id_especialidad) VALUES (?, ?, ?, ?, ?, ?)",
        [dni, nombre, apellido, celular, correo, id_especialidad]
      );
      res.json({ id_profesional: result.insertId, ...req.body });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/profesionales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { dni, nombre, apellido, celular, correo, id_especialidad } = req.body;
      await db.query(
        "UPDATE Profesional SET dni = ?, nombre = ?, apellido = ?, celular = ?, correo = ?, id_especialidad = ? WHERE id_profesional = ?",
        [dni, nombre, apellido, celular, correo, id_especialidad, id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/profesionales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM Profesional WHERE id_profesional = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // OBRAS SOCIALES
  // ============================================
  app.get("/api/obras_sociales", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM Obra_Social ORDER BY nombre");
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PACIENTES
  // ============================================
  app.get("/api/pacientes", async (req, res) => {
    try {
      const query = `
        SELECT p.*, o.nombre AS obra_social_nombre 
        FROM Paciente p 
        LEFT JOIN Obra_Social o ON p.id_obra_social = o.id_obra_social
        ORDER BY p.nombre, p.apellido
      `;
      const [rows] = await db.query(query);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pacientes", async (req, res) => {
    try {
      const { dni, nombre, apellido, celular, email, id_obra_social } = req.body;
      const [result] = await db.query(
        "INSERT INTO Paciente (dni, nombre, apellido, celular, email, id_obra_social) VALUES (?, ?, ?, ?, ?, ?)",
        [dni, nombre, apellido, celular, email, id_obra_social]
      );
      res.json({ id_paciente: result.insertId, ...req.body });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/pacientes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { dni, nombre, apellido, celular, email, id_obra_social } = req.body;
      await db.query(
        "UPDATE Paciente SET dni = ?, nombre = ?, apellido = ?, celular = ?, email = ?, id_obra_social = ? WHERE id_paciente = ?",
        [dni, nombre, apellido, celular, email, id_obra_social, id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pacientes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM Paciente WHERE id_paciente = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================
  // AGENDAS
  // ============================================
  app.get("/api/agendas", async (req, res) => {
    try {
      const { id_profesional } = req.query;
      let query = `
        SELECT a.id_agenda, a.id_profesional, DATE_FORMAT(a.fecha_atencion, '%Y-%m-%d') AS fecha_atencion, 
               h.id_horario, TIME_FORMAT(h.hora, '%H:%i') AS hora
        FROM Agenda a
        LEFT JOIN Agenda_Horario_Dia h ON a.id_agenda = h.id_agenda
      `;
      const params = [];
      if (id_profesional) {
        query += " WHERE a.id_profesional = ?";
        params.push(id_profesional);
      }
      const [rows] = await db.query(query, params);
      
      // Agrupar horarios por agenda/fecha
      const agendasMap = {};
      rows.forEach(row => {
        const key = `${row.id_profesional}_${row.fecha_atencion}`;
        if (!agendasMap[key]) {
          agendasMap[key] = {
            id_agenda: row.id_agenda,
            id_profesional: row.id_profesional,
            fecha_atencion: row.fecha_atencion,
            horarios: []
          };
        }
        if (row.id_horario && row.hora) {
          agendasMap[key].horarios.push(row.hora);
        }
      });
      res.json(Object.values(agendasMap));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agendas", async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id_profesional, fecha_atencion, horarios } = req.body; // horarios = array de strings
      await connection.beginTransaction();

      // Verificar si ya existe agenda ese día
      let [existing] = await connection.query(
        "SELECT id_agenda FROM Agenda WHERE id_profesional = ? AND fecha_atencion = ?", 
        [id_profesional, fecha_atencion]
      );
      
      let id_agenda;
      if (existing.length > 0) {
        id_agenda = existing[0].id_agenda;
        // Borrar horarios viejos
        await connection.query("DELETE FROM Agenda_Horario_Dia WHERE id_agenda = ?", [id_agenda]);
      } else {
        const [result] = await connection.query(
          "INSERT INTO Agenda (id_profesional, fecha_atencion) VALUES (?, ?)",
          [id_profesional, fecha_atencion]
        );
        id_agenda = result.insertId;
      }

      if (horarios && horarios.length > 0) {
        const values = horarios.map(hora => [id_agenda, hora]);
        await connection.query(
          "INSERT INTO Agenda_Horario_Dia (id_agenda, hora) VALUES ?",
          [values]
        );
      }

      await connection.commit();
      res.json({ success: true, id_agenda });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ error: error.message });
    } finally {
      connection.release();
    }
  });

  app.post("/api/agendas/replace", async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id_profesional, dias, horarios } = req.body;
      await connection.beginTransaction();

      // Borrar todas las agendas previas de este profesional (primero detalles para no violar FK)
      await connection.query(
        "DELETE FROM Agenda_Horario_Dia WHERE id_agenda IN (SELECT id_agenda FROM Agenda WHERE id_profesional = ?)", 
        [id_profesional]
      );
      await connection.query("DELETE FROM Agenda WHERE id_profesional = ?", [id_profesional]);

      // Insertar las nuevas agendas
      for (const fecha_atencion of dias) {
        const [result] = await connection.query(
          "INSERT INTO Agenda (id_profesional, fecha_atencion) VALUES (?, ?)",
          [id_profesional, fecha_atencion]
        );
        const id_agenda = result.insertId;

        if (horarios && horarios.length > 0) {
          const values = horarios.map(hora => [id_agenda, hora]);
          await connection.query(
            "INSERT INTO Agenda_Horario_Dia (id_agenda, hora) VALUES ?",
            [values]
          );
        }
      }

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ error: error.message });
    } finally {
      connection.release();
    }
  });

  // ============================================
  // TURNOS
  // ============================================
  app.get("/api/turnos", async (req, res) => {
    try {
      const query = `
        SELECT t.id_turno, DATE_FORMAT(t.fecha, '%Y-%m-%d') AS fecha, TIME_FORMAT(t.hora, '%H:%i') AS hora, t.estado, t.id_paciente, t.id_profesional, t.id_obra_social,
               p.nombre AS pac_nombre, p.apellido AS pac_apellido, p.dni AS pac_dni, p.celular, p.email,
               prof.nombre AS prof_nombre, prof.apellido AS prof_apellido,
               e.nombre_especialidad,
               os.nombre AS obra_social_nombre
        FROM Turno t
        JOIN Paciente p ON t.id_paciente = p.id_paciente
        JOIN Profesional prof ON t.id_profesional = prof.id_profesional
        JOIN Especialidad e ON prof.id_especialidad = e.id_especialidad
        JOIN Obra_Social os ON p.id_obra_social = os.id_obra_social
        ORDER BY t.fecha, t.hora
      `;
      const [rows] = await db.query(query);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/turnos", async (req, res) => {
    try {
      const { fecha, hora, estado, id_paciente, id_profesional, id_obra_social } = req.body;
      
      // Eliminar turno cancelado anterior en el mismo horario si existe para evitar violación de UNIQUE
      await db.query(
        "DELETE FROM Turno WHERE id_profesional = ? AND fecha = ? AND hora = ? AND estado = 'cancelado'",
        [id_profesional, fecha, hora]
      );

      const [result] = await db.query(
        "INSERT INTO Turno (fecha, hora, estado, id_paciente, id_profesional, id_obra_social) VALUES (?, ?, ?, ?, ?, ?)",
        [fecha, hora, estado || 'confirmado', id_paciente, id_profesional, id_obra_social]
      );
      res.json({ id_turno: result.insertId, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/turnos/reservar", async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { paciente, id_profesional, fecha, hora } = req.body;
      
      let id_paciente;
      if (paciente.id_paciente) {
        id_paciente = paciente.id_paciente;
        if (!paciente.id_obra_social) {
           const [pacData] = await connection.query("SELECT id_obra_social FROM Paciente WHERE id_paciente = ?", [id_paciente]);
           if(pacData.length > 0) {
               paciente.id_obra_social = pacData[0].id_obra_social;
           }
        } else {
            await connection.query("UPDATE Paciente SET id_obra_social = ? WHERE id_paciente = ?", [paciente.id_obra_social, id_paciente]);
        }
      } else {
        // Buscar paciente por DNI
        const [pacRows] = await connection.query("SELECT id_paciente FROM Paciente WHERE dni = ?", [paciente.dni]);
        if (pacRows.length > 0) {
          id_paciente = pacRows[0].id_paciente;
          // Opcional: actualizar datos del paciente si cambiaron
          await connection.query(
            "UPDATE Paciente SET nombre=?, apellido=?, celular=?, email=?, id_obra_social=? WHERE id_paciente = ?",
            [paciente.nombre, paciente.apellido, paciente.celular, paciente.email, paciente.id_obra_social, id_paciente]
          );
        } else {
          await connection.query("INSERT IGNORE INTO Obra_Social (id_obra_social, nombre) VALUES (1, 'Particular')");
          const [result] = await connection.query(
            "INSERT INTO Paciente (dni, nombre, apellido, celular, email, id_obra_social) VALUES (?, ?, ?, ?, ?, ?)",
            [paciente.dni, paciente.nombre, paciente.apellido, paciente.celular, paciente.email, paciente.id_obra_social || 1]
          );
          id_paciente = result.insertId;
        }
      }

      // Eliminar turno cancelado anterior en el mismo horario si existe para evitar violación de UNIQUE
      await connection.query(
        "DELETE FROM Turno WHERE id_profesional = ? AND fecha = ? AND hora = ? AND estado = 'cancelado'",
        [id_profesional, fecha, hora]
      );

      const [resTurno] = await connection.query(
        "INSERT INTO Turno (fecha, hora, estado, id_paciente, id_profesional, id_obra_social) VALUES (?, ?, 'confirmado', ?, ?, ?)",
        [fecha, hora, id_paciente, id_profesional, paciente.id_obra_social || 1]
      );
      
      await connection.commit();
      res.json({ id_turno: resTurno.insertId, success: true });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ error: error.message });
    } finally {
      connection.release();
    }
  });

  app.put("/api/turnos/:id/estado", async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      await db.query("UPDATE Turno SET estado = ? WHERE id_turno = ?", [estado, id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/turnos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { fecha, hora, estado } = req.body;

      // Obtener el id_profesional del turno actual para borrar posibles turnos cancelados en la nueva fecha/hora
      const [turnoRows] = await db.query("SELECT id_profesional FROM Turno WHERE id_turno = ?", [id]);
      if (turnoRows.length > 0) {
        const id_profesional = turnoRows[0].id_profesional;
        await db.query(
          "DELETE FROM Turno WHERE id_profesional = ? AND fecha = ? AND hora = ? AND estado = 'cancelado'",
          [id_profesional, fecha, hora]
        );
      }

      let query = "UPDATE Turno SET fecha=?, hora=?";
      const params = [fecha, hora];
      if (estado) {
        query += ", estado=?";
        params.push(estado);
      }
      query += " WHERE id_turno = ?";
      params.push(id);
      
      await db.query(query, params);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // REGISTRO PACIENTE
  // ============================================
  app.post("/api/registro-paciente", async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { dni, nombre, apellido, celular, email, password, id_obra_social } = req.body;
      const id_os = id_obra_social ? parseInt(id_obra_social, 10) : 1;
      
      // Chequear si existe el dni
      const [pacExists] = await conn.query("SELECT * FROM Paciente WHERE dni = ?", [dni]);
      let id_paciente;
      if (pacExists.length > 0) {
        id_paciente = pacExists[0].id_paciente;
        await conn.query("UPDATE Paciente SET nombre=?, apellido=?, celular=?, email=?, id_obra_social=? WHERE id_paciente=?", [nombre, apellido, celular, email, id_os, id_paciente]);
      } else {
        // Para pacientes particulares, asegurar que exista la obra social 1
        await conn.query("INSERT IGNORE INTO Obra_Social (id_obra_social, nombre) VALUES (1, 'Particular')");
        
        const [resultPac] = await conn.query(
          "INSERT INTO Paciente (dni, nombre, apellido, celular, email, id_obra_social) VALUES (?, ?, ?, ?, ?, ?)",
          [dni, nombre, apellido, celular, email, id_os]
        );
        id_paciente = resultPac.insertId;
      }

      // Asegurarse de que el rol de paciente (4) exista
      await conn.query("INSERT IGNORE INTO Rol (id_rol, nombre_rol) VALUES (4, 'Paciente')");

      // Crear usuario
      const [uExists] = await conn.query("SELECT * FROM Usuario WHERE username = ?", [dni]);
      if (uExists.length > 0) {
        throw new Error("El DNI ya se encuentra registrado.");
      }

      const [resU] = await conn.query(
        "INSERT INTO Usuario (username, password, id_rol, id_paciente) VALUES (?, ?, ?, ?)",
        [dni, password, 4, id_paciente] // 4 = Paciente
      );

      await conn.commit();
      res.json({ success: true, id_paciente });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  });

  // ============================================
  // SECRETARIAS
  // ============================================
  app.get("/api/secretarias", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM Secretaria ORDER BY apellido, nombre");
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/secretarias", async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { dni, nombre, apellido, estado, password } = req.body;
      
      const [uExists] = await conn.query("SELECT * FROM Usuario WHERE username = ?", [dni]);
      if (uExists.length > 0) throw new Error("El DNI/Usuario ya existe.");

      const [resSec] = await conn.query(
        "INSERT INTO Secretaria (dni, nombre, apellido, estado) VALUES (?, ?, ?, ?)",
        [dni, nombre, apellido, estado || 'activo']
      );
      
      await conn.query(
        "INSERT INTO Usuario (username, password, id_rol, id_secretaria) VALUES (?, ?, ?, ?)",
        [dni, password, 2, resSec.insertId] // 2 = Secretaria
      );

      await conn.commit();
      res.json({ success: true, id_secretaria: resSec.insertId });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  });

  app.put("/api/secretarias/:id", async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { id } = req.params;
      const { dni, nombre, apellido, estado, password } = req.body;
      
      await conn.query(
        "UPDATE Secretaria SET dni=?, nombre=?, apellido=?, estado=? WHERE id_secretaria=?",
        [dni, nombre, apellido, estado, id]
      );

      if (password) {
        await conn.query("UPDATE Usuario SET password=?, username=? WHERE id_secretaria=?", [password, dni, id]);
      } else {
        await conn.query("UPDATE Usuario SET username=? WHERE id_secretaria=?", [dni, id]);
      }

      await conn.commit();
      res.json({ success: true });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  });

  // ============================================
  // AUTENTICACIÓN REAL
  // ============================================
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const query = `
        SELECT u.id_usuario, u.username, u.password, u.id_rol, u.id_profesional, u.id_paciente,
               r.nombre_rol,
               p.nombre AS prof_nombre, p.apellido AS prof_apellido,
               pac.nombre AS pac_nombre, pac.apellido AS pac_apellido,
               pac.celular AS pac_celular, pac.email AS pac_email
        FROM Usuario u
        JOIN Rol r ON u.id_rol = r.id_rol
        LEFT JOIN Profesional p ON u.id_profesional = p.id_profesional
        LEFT JOIN Paciente pac ON u.id_paciente = pac.id_paciente
        WHERE u.username = ? AND u.password = ?
      `;
      const [rows] = await db.query(query, [username, password]);
      
      if (rows.length > 0) {
        const user = rows[0];
        res.json({
          success: true,
          user: {
            id_usuario: user.id_usuario,
            username: user.username,
            id_rol: user.id_rol,
            nombre_rol: user.nombre_rol,
            id_profesional: user.id_profesional,
            profesional_nombre: user.id_profesional ? `${user.prof_nombre} ${user.prof_apellido}` : null,
            id_paciente: user.id_paciente,
            paciente_nombre: user.id_paciente ? `${user.pac_nombre} ${user.pac_apellido}` : null
          }
        });
      } else {
        res.status(401).json({ success: false, error: "⚠️ Usuario o contraseña incorrectos" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ABM OBRAS SOCIALES
  // ============================================
  app.post("/api/obras_sociales", async (req, res) => {
    try {
      const { nombre } = req.body;
      const [result] = await db.query("INSERT INTO Obra_Social (nombre) VALUES (?)", [nombre]);
      res.json({ id_obra_social: result.insertId, nombre, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/obras_sociales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre } = req.body;
      await db.query("UPDATE Obra_Social SET nombre = ? WHERE id_obra_social = ?", [nombre, id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/obras_sociales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Controlar si tiene pacientes vinculados
      const [pacs] = await db.query("SELECT id_paciente FROM Paciente WHERE id_obra_social = ? LIMIT 1", [id]);
      if (pacs.length > 0) {
        return res.status(400).json({ success: false, error: "No se puede eliminar la obra social porque tiene pacientes vinculados." });
      }
      
      await db.query("DELETE FROM Obra_Social WHERE id_obra_social = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ABM ESPECIALIDADES
  // ============================================
  app.post("/api/especialidades", async (req, res) => {
    try {
      const { nombre_especialidad, icono } = req.body;
      const [result] = await db.query("INSERT INTO Especialidad (nombre_especialidad, icono) VALUES (?, ?)", [nombre_especialidad, icono || '🩺']);
      res.json({ id_especialidad: result.insertId, nombre_especialidad, icono, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/especialidades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre_especialidad, icono } = req.body;
      await db.query("UPDATE Especialidad SET nombre_especialidad = ?, icono = ? WHERE id_especialidad = ?", [nombre_especialidad, icono || '🩺', id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/especialidades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Controlar si tiene profesionales vinculados
      const [profs] = await db.query("SELECT id_profesional FROM Profesional WHERE id_especialidad = ? LIMIT 1", [id]);
      if (profs.length > 0) {
        return res.status(400).json({ success: false, error: "No se puede eliminar la especialidad porque tiene profesionales vinculados." });
      }
      
      await db.query("DELETE FROM Especialidad WHERE id_especialidad = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta de prueba
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Servidor Express corriendo." });
  });

  // Vite middleware for development y assets estáticos
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Si hicieran un build para producción
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  });
}

startServer();
