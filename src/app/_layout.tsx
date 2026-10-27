import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, fonts, type } from '@/components/theme';
import { receiptNames } from '@/lib/backup';
import { useHydrated, useReminderSync } from '@/lib/hooks';
import { pruneReceipts } from '@/lib/receipts';
import { useBudget } from '@/lib/store';

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
  });
  const onboarded = useBudget((s) => s.onboarded);
  useReminderSync(hydrated && onboarded);
  // Clear out receipt photos left behind, e.g. one picked before the app was closed mid-edit.
  useEffect(() => {
    if (hydrated) pruneReceipts(receiptNames(useBudget.getState()));
  }, [hydrated]);

  // Wait for saved data so first-launch setup doesn't flash for returning users.
  // If the fonts fail to load, carry on with the system font.
  if (!hydrated || (!fontsLoaded && !fontError)) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.accent,
          // Same big left-aligned title as the tab screens. iOS shows it as a large title that
          // shrinks into the bar on scroll; elsewhere it's the same size as the tab titles.
          headerTitleAlign: 'left',
          headerTitleStyle: {
            color: colors.text,
            fontFamily: fonts.bold,
            fontSize: Platform.OS === 'ios' ? type.headline.fontSize : type.title.fontSize,
          },
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerLargeTitleStyle: { color: colors.text, fontFamily: fonts.bold },
          contentStyle: { backgroundColor: colors.background },
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="envelope/[id]" options={{ title: '' }} />
        <Stack.Screen name="spending" options={{ title: 'Spending' }} />
        <Stack.Screen name="bills" options={{ title: 'Bills' }} />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal', title: 'Log spending' }} />
        <Stack.Screen name="bill" options={{ presentation: 'modal', title: 'Bill' }} />
        <Stack.Screen name="goal" options={{ presentation: 'modal', title: 'Goal' }} />
        <Stack.Screen name="move-money" options={{ presentation: 'modal', title: 'Move money' }} />
        <Stack.Screen name="new-envelope" options={{ presentation: 'modal', title: 'New category' }} />
        <Stack.Screen name="edit-limit" options={{ presentation: 'modal', title: 'Monthly limit' }} />
        <Stack.Screen name="receipt" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack>
    </>
  );
}
