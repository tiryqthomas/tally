import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { colors, fonts, machine, type, useScheme } from '@/components/theme';
import { useBudget } from '@/lib/store';

export default function TabLayout() {
  useScheme();
  const onboarded = useBudget((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: machine.tabInactive,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.label, fontSize: 11 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        // Big left-aligned screen titles, like the month title on Home.
        headerTitleAlign: 'left',
        headerTitleStyle: { color: colors.text, fontFamily: fonts.bold, fontSize: type.title.fontSize, letterSpacing: type.title.letterSpacing },
        headerTitleContainerStyle: { paddingHorizontal: 4 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size + 2} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'list' : 'list-outline'} size={size + 2} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'flag' : 'flag-outline'} size={size + 2} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size + 2} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
