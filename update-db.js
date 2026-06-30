const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Secretaria (
          id_secretaria INT AUTO_INCREMENT PRIMARY KEY,
          dni VARCHAR(20) UNIQUE NOT NULL,
          nombre VARCHAR(100) NOT NULL,
          apellido VARCHAR(100) NOT NULL,
          estado ENUM('activo', 'inactivo') DEFAULT 'activo'
      );
    `);
    
    // Add id_secretaria to Usuario if not exists
    try {
      await connection.query("ALTER TABLE Usuario ADD COLUMN id_secretaria INT DEFAULT NULL;");
      await connection.query("ALTER TABLE Usuario ADD FOREIGN KEY (id_secretaria) REFERENCES Secretaria(id_secretaria) ON DELETE CASCADE;");
    } catch(e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
    }
    
    console.log("DB updated successfully");
  } catch(e) {
    console.error(e);
  } finally {
    connection.end();
  }
}

run();
