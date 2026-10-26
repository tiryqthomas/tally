import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/components/theme';
import { useHydrated, useReminderSync } from '@/lib/hooks';
import { useBudget } from '@/lib/store';

export default function RootLayout() {
  const hydrated = useHydrated();
  const onboarded = useBudget((s) => s.onboarded);
  useReminderSync(hydrated && onboarded);

  // Wait for saved data so first-launch setup doesn't flash for returning users.
  if (!hydrated) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="envelope/[id]" options={{ title: '' }} />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal', title: 'Log spending' }} />
        <Stack.Screen name="bill" options={{ presentation: 'modal', title: 'Bill' }} />
        <Stack.Screen name="move-money" options={{ presentation: 'modal', title: 'Move money' }} />
        <Stack.Screen name="new-envelope" options={{ presentation: 'modal', title: 'New envelope' }} />
      </Stack>
    </>
  );
}
