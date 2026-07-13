import { Pool } from 'pg';

// Crea un "pool" de conexiones. En lugar de abrir y cerrar una conexión
// para cada consulta, el pool las gestiona de forma eficiente.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En desarrollo, puedes conectar a tu Docker así:
  // connectionString: "postgresql://user:password@localhost:5432/smartinventory",
});

export const db = {
  query: (text: string, params: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};