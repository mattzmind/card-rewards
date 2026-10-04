/* Deadline reminders: which phone notifications to schedule for the wallet, from today.
   - Quarterly bonus you must activate: 7 days and 1 day before the deadline (or quarter end),
     and on the day the next quarter's bonus opens.
   - Quarterly category picks: when it's time to confirm next quarter's picks (15 days before quarter end).
   Pure function so it can be tested; src/store/reminders.ts does the scheduling. */
import { qDeadline, qEnd, qLabel, qStart } from './dates';
import { type Ctx, activeWallet, dn, productOf } from './engine';

export interface Reminder { id: string; date: Date; title: string; body: string; cardId: string }

const at10 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function reminderPlan(ctx: Ctx, max = 40): Reminder[] {
  const { NOW, QK, NQK } = ctx.clock, out: Reminder[] = [];
  const push = (r: Reminder) => { if (r.date > NOW) out.push(r); };
  for (const w of activeWallet(ctx)) {
    const p = productOf(ctx, w.product); if (!p) continue;
    const name = dn(ctx, w);
    if (p.rotating) {
      const r = p.rotating;
      for (const k of [QK, NQK]) {
        const q = r.schedule[k];
        if (!q || w.activated.includes(k) || w.dismissed.includes('act:' + k)) continue;
        const due = r.retroactive ? qDeadline(k, r.deadlineDay || 31) : qEnd(k);
        const what = `${name}: ${q.label}`;
        if (k === NQK) push({ id: `open:${w.id}:${k}`, date: at10(q.opens ? new Date(q.opens + 'T00:00:00') : qStart(k)), cardId: w.id,
          title: `Activate your ${qLabel(k)} bonus`, body: `${what} is open. Activate it before you spend.` });
        push({ id: `due7:${w.id}:${k}`, date: at10(addDays(due, -7)), cardId: w.id,
          title: `${qLabel(k)} bonus: a week left`, body: `Activate ${what} by ${md(due)}.` });
        push({ id: `due1:${w.id}:${k}`, date: at10(addDays(due, -1)), cardId: w.id,
          title: `Last day to activate tomorrow`, body: `Activate ${what} by ${md(due)}.` });
      }
    }
    const quarterly = (p.choice || []).filter(s => s.period === 'quarter' && w.sel[s.id]?.opts?.length);
    if (quarterly.length) {
      for (const k of [QK, NQK]) {
        const next = k === QK ? NQK : null; if (!next) continue; // picks for next quarter, asked near this quarter's end
        if (quarterly.every(s => (w.sel[s.id]!.quarter || '') >= next)) continue;
        push({ id: `picks:${w.id}:${next}`, date: at10(addDays(qEnd(k), -15)), cardId: w.id,
          title: `Pick your ${qLabel(next)} categories`, body: `Confirm or change your ${name} categories for next quarter.` });
      }
    }
  }
  return out.sort((a, b) => +a.date - +b.date).slice(0, max);
}
