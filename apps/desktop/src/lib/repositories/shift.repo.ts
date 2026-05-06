import { dbSelect, dbExecute } from "@/lib/db";
import { generateId } from "@/lib/uuid";

export interface CashSession {
  id: string;
  outlet_id: string;
  cashier_id: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  variance: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface CashSessionWithCashier extends CashSession {
  cashier_name: string;
}

export async function getOpenShift(outletId: string): Promise<CashSession | null> {
  const rows = await dbSelect<CashSession>(
    `SELECT * FROM cash_sessions WHERE outlet_id = ? AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 1`,
    [outletId]
  );
  return rows[0] ?? null;
}

export async function openShift(
  outletId: string,
  cashierId: string,
  openingCash: number
): Promise<CashSession> {
  const id = generateId();
  const now = new Date().toISOString();

  await dbExecute(
    `INSERT INTO cash_sessions (id, outlet_id, cashier_id, opening_cash, opened_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, outletId, cashierId, openingCash, now]
  );

  return { id, outlet_id: outletId, cashier_id: cashierId, opening_cash: openingCash, closing_cash: null, expected_cash: null, variance: null, opened_at: now, closed_at: null, notes: null };
}

/** Hitung total kas yang diharapkan = opening_cash + total cash sales sejak shift dibuka. */
export async function calcExpectedCash(session: CashSession): Promise<number> {
  const rows = await dbSelect<{ total: number }>(
    `SELECT COALESCE(SUM(tp.amount), 0) as total
     FROM transaction_payments tp
     JOIN transactions t ON tp.transaction_id = t.id
     WHERE t.outlet_id = ? AND tp.method = 'cash'
       AND t.status = 'paid'
       AND t.created_at >= ?`,
    [session.outlet_id, session.opened_at]
  );
  return session.opening_cash + (rows[0]?.total ?? 0);
}

export async function closeShift(
  sessionId: string,
  closingCash: number,
  expectedCash: number,
  notes?: string
): Promise<CashSession> {
  const now = new Date().toISOString();
  const variance = closingCash - expectedCash;

  await dbExecute(
    `UPDATE cash_sessions SET closing_cash = ?, expected_cash = ?, variance = ?, closed_at = ?, notes = ?
     WHERE id = ?`,
    [closingCash, expectedCash, variance, now, notes ?? null, sessionId]
  );

  const rows = await dbSelect<CashSession>(
    `SELECT * FROM cash_sessions WHERE id = ?`,
    [sessionId]
  );
  return rows[0]!;
}

export async function getShiftHistory(outletId: string, limit = 20): Promise<CashSessionWithCashier[]> {
  return dbSelect<CashSessionWithCashier>(
    `SELECT cs.*, u.full_name as cashier_name
     FROM cash_sessions cs
     JOIN users u ON cs.cashier_id = u.id
     WHERE cs.outlet_id = ?
     ORDER BY cs.opened_at DESC LIMIT ?`,
    [outletId, limit]
  );
}
