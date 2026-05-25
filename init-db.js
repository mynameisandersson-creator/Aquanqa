import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDatabase() {
  const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL
  if (!connectionUri) {
    console.error('✖ No se encontró DATABASE_URL ni MYSQL_URL')
    process.exit(1)
  }

  console.log('→ Conectando a MySQL...')
  const connection = await mysql.createConnection({ uri: connectionUri })
  const schemaPath = path.join(__dirname, 'db', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    try {
      await connection.query(statement)
    } catch (err) {
      const ignorable = ['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_ENTRY']
      if (!ignorable.includes(err.code)) {
        console.error('✖ Error ejecutando statement:', err.message)
        throw err
      }
    }
  }

  await connection.end()
  console.log('✔ Base de datos inicializada')
}

initDatabase().then(() => process.exit(0)).catch(() => process.exit(1))
