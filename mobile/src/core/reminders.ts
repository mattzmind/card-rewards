/* Deadline reminders: which phone notifications to schedule for the wallet, from today.
   - Quarterly bonus you must activate: 7 days and 1 day before the deadline (or quarter end),
     on the day the next quarter's bonus opens, and a few nudges while this quarter's is still off.
   - Quarterly category picks (e.g. US Bank Cash+): 15 and 3 days before the quarter ends, on the first day
     of the new quarter, and a few nudges early in a quarter whose picks aren't saved yet (missing them
     means earning the base rate on everything).
   Nudges sit on fixed days after the quarter starts, so re-planning on every app open never piles them up.
   Each reminder has a kind (bonus or picks); a kind turned off in Notification settings (profile.notify) is skipped.
   Pure function so it can be tested; src/store/reminders.ts does the scheduling. */
import { qDeadline, qEnd, qLabel, qStart } from './dates';
import { type Ctx, activeWallet, brandOf, dn, fmtRate, productOf } from './engine';
import type { NotifyKind } from './types';

export interface Reminder { id: string; kind: NotifyKind; date: Date; title: string; body: string; cardId: string }
type Draft = Omit<Reminder, 'kind'>;

/* Is this kind of reminder on? (missing = on) */
export const notifyOn = (ctx: Pick<Ctx, 'state'>, kind: NotifyKind) => ctx.state.profile.notify?.[kind] !== false;

const at10 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
/* Days after a quarter starts to nudge about something still not done */
const NUDGE_DAYS = [0, 3, 7, 14, 30];

export function reminderPlan(ctx: Ctx, max = 40): Reminder[] {
  const { NOW, QK, NQK } = ctx.clock, out: Reminder[] = [];
  const add = (kind: NotifyKind) => (r: Draft) => { if (r.date > NOW && notifyOn(ctx, kind)) out.push({ ...r, kind }); };
  const bonus = add('bonus'), picks = add('picks');
  for (const w of activeWallet(ctx)) {
    const p = productOf(ctx, w.product); if (!p) continue;
    const name = dn(ctx, w), bank = brandOf(ctx, p.brand).name;
    if (p.rotating) {
      const r = p.rotating;
      for (const k of [QK, NQK]) {
        const q = r.schedule[k];
        if (!q || w.activated.includes(k) || w.dismissed.includes('act:' + k)) continue;
        const due = r.retroactive ? qDeadline(k, r.deadlineDay || 31) : qEnd(k);
        const what = `${name}: ${q.label}`;
        if (k === NQK) bonus({ id: `open:${w.id}:${k}`, date: at10(q.opens ? new Date(q.opens + 'T00:00:00') : qStart(k)), cardId: w.id,
          title: `Activate your ${qLabel(k)} bonus`, body: `${what} is open. Activate it before you spend.` });
        else NUDGE_DAYS.forEach(n => {
          const d = at10(addDays(qStart(k), n));
          if (d < addDays(due, -8)) bonus({ id: `act${n}:${w.id}:${k}`, date: d, cardId: w.id,
            title: `${qLabel(k)} bonus isn't activated yet`, body: `Activate ${what} with ${bank}, then mark it in Lucro.` });
        });
        bonus({ id: `due7:${w.id}:${k}`, date: at10(addDays(due, -7)), cardId: w.id,
          title: `${qLabel(k)} bonus: a week left`, body: `Activate ${what} by ${md(due)}.` });
        bonus({ id: `due1:${w.id}:${k}`, date: at10(addDays(due, -1)), cardId: w.id,
          title: `Last day to activate tomorrow`, body: `Activate ${what} by ${md(due)}.` });
      }
    }
    const quarterly = (p.choice || []).filter(s => s.period === 'quarter');
    if (quarterly.length) {
      const savedFor = (k: string) => quarterly.every(s => w.sel[s.id]?.opts?.length && (w.sel[s.id]!.quarter || '') >= k);
      const base = `${name} earns ${fmtRate(p.base)}% on everything until you choose`;
      /* This quarter: picks missing, or left over from an earlier quarter */
      if (!savedFor(QK)) NUDGE_DAYS.forEach(n => {
        const d = at10(addDays(qStart(QK), n));
        if (d < addDays(qEnd(QK), -15)) picks({ id: `pick${n}:${w.id}:${QK}`, date: d, cardId: w.id,
          title: `Choose your ${qLabel(QK)} categories`, body: `${base}. Pick them with ${bank}, then save them in Lucro.` });
      });
      /* Next quarter: before it opens, near the end, and on day one */
      if (!savedFor(NQK)) {
        picks({ id: `picks:${w.id}:${NQK}`, date: at10(addDays(qEnd(QK), -15)), cardId: w.id,
          title: `Pick your ${qLabel(NQK)} categories`, body: `Choose your ${name} categories for next quarter with ${bank}, then save them in Lucro.` });
        picks({ id: `picks3:${w.id}:${NQK}`, date: at10(addDays(qEnd(QK), -3)), cardId: w.id,
          title: `3 days left to pick ${qLabel(NQK)} categories`, body: `${base}. Choose them with ${bank} before ${md(addDays(qEnd(QK), 1))}.` });
        picks({ id: `picks0:${w.id}:${NQK}`, date: at10(qStart(NQK)), cardId: w.id,
          title: `New quarter: confirm your ${name} categories`, body: `${qLabel(NQK)} started today. Make sure your picks are set with ${bank}.` });
      }
    }
  }
  return out.sort((a, b) => +a.date - +b.date).slice(0, max);
}
