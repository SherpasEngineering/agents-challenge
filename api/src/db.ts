import pg from 'pg';
import { config } from './config';

// NUMERIC llega como string por defecto; para esta app nos vale con number.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => parseFloat(v));
// DATE como 'YYYY-MM-DD', sin líos de zona horaria.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function one<T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}
