/* Backup files: the same JSON the web app saves ("lucro-backup-YYYY-MM-DD.json"),
   so a wallet moves between the web app and the phone app in either direction. */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { iso } from '@/core/dates';
import type { AppState } from '@/core/types';

import { upgrade, useApp } from './app';

export async function exportBackup() {
  const { state, update } = useApp.getState();
  const today = iso(new Date());
  const file = new File(Paths.cache, `lucro-backup-${today}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify({ app: 'card-maximizer', saved: new Date().toISOString(), state }, null, 1));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Lucro backup', UTI: 'public.json' });
  update(s => { s.backedUp = today; });
}

/* Returns the number of cards restored, or null if cancelled; throws on a bad file */
export async function importBackup(): Promise<number | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const text = await new File(res.assets[0].uri).text();
  const d = JSON.parse(text), s = (d.state || d) as AppState;
  if (!s || !Array.isArray(s.wallet)) throw new Error("That file isn't a Lucro backup");
  const next = upgrade(s);
  next.onboarded = true;
  next.profile.since = next.profile.since || iso(new Date());
  useApp.getState().replace(next);
  return next.wallet.length;
}
