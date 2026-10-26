import { BarlowSemiCondensed_500Medium, BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold, BarlowSemiCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-semi-condensed';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors, fonts } from '@/components/theme';
import { useHydrated, useReminderSync } from '@/lib/hooks';
import { useBudget } from '@/lib/store';

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    ShareTechMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    BarlowSemiCondensed_500Medium,
    BarlowSemiCondensed_600SemiBold,
    BarlowSemiCondensed_700Bold,
    BarlowSemiCondensed_800ExtraBold_Italic,
  });
  const onboarded = useBudget((s) => s.onboarded);
  useReminderSync(hydrated && onboarded);

  // Wait for saved data so first-launch setup doesn't flash for returning users.
  // If the fonts fail to load, carry on with the system font.
  if (!hydrated || (!fontsLoaded && !fontError)) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontFamily: fonts.bold },
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
      </Stack>
    </>
  );
}
