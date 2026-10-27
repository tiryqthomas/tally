import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { applyScheme, colors, fonts, SchemeContext, type } from '@/components/theme';
import { receiptNames } from '@/lib/backup';
import { useHydrated, useReminderSync } from '@/lib/hooks';
import { pruneReceipts } from '@/lib/receipts';
import { useBudget } from '@/lib/store';

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    // Fraunces with its "soft" axis at 100 and optical size 36, so the serif has rounded ends.
    Fraunces_400Soft: require('../../assets/fonts/Fraunces_400Soft.ttf'),
    Fraunces_500Soft: require('../../assets/fonts/Fraunces_500Soft.ttf'),
  });
  // Appearance: System follows the phone; Light and Dark lock it. The palette switches here,
  // before anything below draws, and screens redraw through SchemeContext.
  const appearance = useBudget((s) => s.appearance);
  const system = useColorScheme();
  const scheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  applyScheme(scheme);
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
    <SchemeContext.Provider value={scheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.accent,
          // Same big left-aligned title as the tab screens. iOS shows it as a large title that
          // shrinks into the bar on scroll; elsewhere it's the same size as the tab titles.
          headerTitleAlign: 'left',
          headerTitleStyle: {
            color: colors.text,
            fontFamily: Platform.OS === 'ios' ? fonts.bold : fonts.serif,
            fontSize: Platform.OS === 'ios' ? type.headline.fontSize : type.title.fontSize,
          },
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerLargeTitleStyle: { color: colors.text, fontFamily: fonts.serif },
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
        <Stack.Screen name="add-expense" options={{ presentation: 'modal', title: 'Log expense' }} />
        <Stack.Screen name="bill" options={{ presentation: 'modal', title: 'Bill' }} />
        <Stack.Screen name="goal" options={{ presentation: 'modal', title: 'Goal' }} />
        <Stack.Screen name="move-money" options={{ presentation: 'modal', title: 'Move money' }} />
        <Stack.Screen name="new-envelope" options={{ presentation: 'modal', title: 'New category' }} />
        <Stack.Screen name="edit-limit" options={{ presentation: 'modal', title: 'Monthly limit' }} />
        <Stack.Screen name="receipt" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack>
    </SchemeContext.Provider>
  );
}
