/* Feedback ("Wrong card?", "Request a store", "Request a card") goes straight to the Lucro team's inbox.
   Web3Forms turns the POST into an email, so the app needs no server of its own. The access key only
   allows sending to the inbox it was created for, so it's fine to ship in the app.
   Anything that can't be sent (offline, no key yet) waits in state.outbox and goes out on the next launch. */
import Constants from 'expo-constants';

import type { Report } from '@/core/types';

import { useApp } from './app';

/* Create one free at https://web3forms.com with the inbox that should receive feedback */
export const FEEDBACK_KEY = '';
const ENDPOINT = 'https://api.web3forms.com/submit';

export const reportLine = (r: Report) => `${r.at} | ${r.where} | ${r.card} | ${r.reason}${r.note ? ' | ' + r.note : ''}`;

async function post(r: Report): Promise<boolean> {
  if (!FEEDBACK_KEY) return false;
  const { catalog } = useApp.getState();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: FEEDBACK_KEY, from_name: 'Lucro app', subject: `Lucro feedback: ${r.reason}`,
        message: reportLine(r), where: r.where, category: r.cat, card: r.card, reason: r.reason, note: r.note,
        app: `Lucro ${Constants.expoConfig?.version || ''}`, catalog: catalog.version,
      }),
    });
    const data = await res.json().catch(() => null);
    return res.ok && !!data?.success;
  } catch { return false; }
}

/* Send now; keep it for later if that fails */
export async function sendFeedback(r: Report) {
  if (await post(r)) return true;
  useApp.getState().update(s => { s.outbox = [...((s.outbox as Report[]) || []), r]; });
  return false;
}

/* Retry anything left over (called on launch) */
export async function flushOutbox() {
  const box = (useApp.getState().state.outbox as Report[] | undefined) || [];
  if (!box.length) return;
  const left: Report[] = [];
  for (const r of box) if (!(await post(r))) left.push(r);
  useApp.getState().update(s => { s.outbox = left; });
}
