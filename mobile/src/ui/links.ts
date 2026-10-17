/* Web addresses the app links to. SITE_URL is the public site (site/ in the repo, served by GitHub Pages);
   switch it to the real domain at launch (see site/README.md). Site pages open in the in-app browser
   (Safari view on iPhone, Custom Tabs on Android), so people stay in Lucro. */
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { type Ctx, brandOf, productOf } from '@/core/engine';
import type { WalletCard } from '@/core/types';

export const APP_URL = 'https://mattzmind.github.io/card-rewards/';
export const SITE_URL = 'https://mattzmind.github.io/card-rewards/site/';

/* The card's bank login page, e.g. to activate a quarterly bonus */
export function openBank(ctx: Ctx, w: WalletCard) {
  const url = brandOf(ctx, productOf(ctx, w.product)?.brand || '').login;
  if (url) Linking.openURL(url).catch(() => {});
}

export function openSite(page: 'support' | 'privacy' | 'terms') {
  const url = `${SITE_URL}${page}.html`;
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
}
