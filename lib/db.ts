import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Configure-a no arquivo .env')
}

// Cliente HTTP serverless do Neon. Usado como tagged template: sql`SELECT ...`
const sql = neon(process.env.DATABASE_URL)

export default sql
