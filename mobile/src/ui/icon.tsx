import { SvgXml } from 'react-native-svg';

import { ICONS } from './icon-paths';

/* Same line icons as the web app; unknown names fall back to "other" */
export function Icon({ name, size = 22, color, strokeWidth = 1.8, fill = 'none' }:
  { name: string; size?: number; color: string; strokeWidth?: number; fill?: string }) {
  const xml = `<svg viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.other}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
