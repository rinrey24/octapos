import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

/** Singleton koneksi SQLite via Tauri SQL plugin. */
export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:octapos.db");
  }
  return _db;
}

/** Helper: SELECT dengan tipe generik. */
export async function dbSelect<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  // tauri-plugin-sql select<T> returns Promise<T>, so we type as T[]
  return db.select<T[]>(sql, params);
}

/** Helper: INSERT / UPDATE / DELETE. */
export async function dbExecute(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.execute(sql, params);
}
