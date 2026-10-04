/* Quarter math. Everything takes an explicit "now" so tests can pin the date. */

export const iso = (d: Date) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const qKey = (d: Date) => d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
export const qLabel = (k: string) => { const [y, q] = k.split('-'); return q + ' ' + y; };
export const qEnd = (k: string) => { const [y, q] = k.split('-Q').map(Number); return new Date(y, q * 3, 0); };
export const qStart = (k: string) => { const [y, q] = k.split('-Q').map(Number); return new Date(y, (q - 1) * 3, 1); };
export const qDeadline = (k: string, day: number) => { const [y, q] = k.split('-Q').map(Number); return new Date(y, q * 3 - 1, day); };
export const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const isoToDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export interface Clock {
  NOW: Date;
  TODAY: string;
  QK: string;       // this quarter, e.g. "2026-Q4"
  NQK: string;      // next quarter
  daysLeftInQ: number;
  PICK_Q: string;   // near quarter end, quarterly picks are for next quarter
}
export function makeClock(now: Date = new Date()): Clock {
  const QK = qKey(now);
  const q = Math.floor(now.getMonth() / 3) + 1;
  const NQK = q === 4 ? (now.getFullYear() + 1) + '-Q1' : now.getFullYear() + '-Q' + (q + 1);
  const daysLeftInQ = Math.round((+qEnd(QK) - +new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  return { NOW: now, TODAY: iso(now), QK, NQK, daysLeftInQ, PICK_Q: daysLeftInQ <= 15 ? NQK : QK };
}
