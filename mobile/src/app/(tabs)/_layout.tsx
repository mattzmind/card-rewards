import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useColors } from '@/ui/theme';

/* Earn and Wallet place their own content under the status bar, so the automatic scroll inset is off
   (it stacked a second safe-area gap above the header). Re-tapping a tab scrolls it to the top. */
export default function TabsLayout() {
  const c = useColors();
  return (
    <NativeTabs backgroundColor={c.surface} indicatorColor={c.hl} labelStyle={{ selected: { color: c.ink } }} tintColor={c.ink}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Earn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'dollarsign.circle', selected: 'dollarsign.circle.fill' }} md="paid" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Wallet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'wallet.bifold', selected: 'wallet.bifold.fill' }} md="account_balance_wallet" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
