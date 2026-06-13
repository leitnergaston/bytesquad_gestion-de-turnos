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
        SELECT a.id_agenda, a.id_profesional, a.fecha_atencion, 
               h.id_horario, h.hora
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
        if (row.id_horario) {
          // Parsear y formatear hora
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
        SELECT t.*, 
               p.nombre AS pac_nombre, p.apellido AS pac_apellido, p.dni AS pac_dni,
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
      const { fecha, hora, estado, motivo_consulta, id_paciente, id_profesional, id_obra_social } = req.body;
      const [result] = await db.query(
        "INSERT INTO Turno (fecha, hora, estado, motivo_consulta, id_paciente, id_profesional, id_obra_social) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [fecha, hora, estado || 'confirmado', motivo_consulta, id_paciente, id_profesional, id_obra_social]
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
        const [result] = await connection.query(
          "INSERT INTO Paciente (dni, nombre, apellido, celular, email, id_obra_social) VALUES (?, ?, ?, ?, ?, ?)",
          [paciente.dni, paciente.nombre, paciente.apellido, paciente.celular, paciente.email, paciente.id_obra_social]
        );
        id_paciente = result.insertId;
      }

      const [resTurno] = await connection.query(
        "INSERT INTO Turno (fecha, hora, estado, id_paciente, id_profesional, id_obra_social) VALUES (?, ?, 'confirmado', ?, ?, ?)",
        [fecha, hora, id_paciente, id_profesional, paciente.id_obra_social]
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
