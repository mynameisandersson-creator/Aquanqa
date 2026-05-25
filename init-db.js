import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: Number(process.env.MYSQLPORT) || 3306,
    multipleStatements: true,
  })

  console.log('✔ Conectado a MySQL. Ejecutando schema...')

  const schemaPath = path.join(__dirname, 'db', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')

  // Split on semicolons, filter empty statements, run each one individually
  // so errors on already-existing objects are caught per-statement.
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const statement of statements) {
    try {
      await connection.execute(statement)
    } catch (err) {
      // ER_TABLE_EXISTS_ERROR, ER_DUP_KEYNAME, etc. — safe to ignore
      if (err.code && (err.code.startsWith('ER_TABLE_EXISTS') || err.code === 'ER_DUP_KEYNAME')) {
        console.warn(`⚠ Ignorado (ya existe): ${err.code}`)
      } else {
        console.error(`✖ Error ejecutando sentencia:\n${statement}\n`, err.message)
        // Non-fatal: log and continue so remaining statements still run
      }
    }
  }

  await connection.end()
  console.log('✔ Schema aplicado correctamente. Base de datos lista.')
}

initDatabase().catch((err) => {
  console.error('✖ Error fatal al inicializar la base de datos:', err.message)
  process.exit(1)
})
