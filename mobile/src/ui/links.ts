/* Web addresses the app links to. SITE_URL is the public site (site/ in the repo, served by GitHub Pages);
   switch it to the real domain at launch (see site/README.md). Site pages open in the in-app browser
   (Safari view on iPhone, Custom Tabs on Android), so people stay in Lucro. */
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

export const APP_URL = 'https://mattzmind.github.io/card-rewards/';
export const SITE_URL = 'https://mattzmind.github.io/card-rewards/site/';

export function openSite(page: 'support' | 'privacy' | 'terms') {
  const url = `${SITE_URL}${page}.html`;
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
}
