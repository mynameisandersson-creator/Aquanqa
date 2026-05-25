import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const connectionUri = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/aquanqa'

export const pool = mysql.createPool({
  uri: connectionUri,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
