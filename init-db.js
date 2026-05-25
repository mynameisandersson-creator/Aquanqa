import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT || 3306,
    });

    console.log('✓ Conectado a MySQL');

    const schema = fs.readFileSync(path.join(process.cwd(), 'db/schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✓ Ejecutado:', statement.substring(0, 50) + '...');
        } catch (err) {
          console.error('✗ Error:', err.message);
        }
      }
    }

    await connection.end();
    console.log('✓ Schema inicializado correctamente');
  } catch (err) {
    console.error('✗ Error de conexión:', err.message);
    process.exit(1);
  }
}

initDB();
