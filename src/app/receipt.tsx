import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { keyColors } from '@/components/machine';
import { machine, spacing, useScheme } from '@/components/theme';
import { styles } from '@/components/ui';
import { receiptUri } from '@/lib/receipts';

// A receipt photo at full size. Pinch to zoom on iOS.
export default function ReceiptScreen() {
  useScheme();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { width, height } = useWindowDimensions();
  const uri = name ? receiptUri(name) : null;
  const key = keyColors('light');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: machine.display }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.chip, { backgroundColor: key.face, borderColor: key.edge, minHeight: 44, justifyContent: 'center' }]}
        >
          <Text style={styles.chipText}>Done</Text>
        </Pressable>
      </View>
      {uri ? (
        <ScrollView
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <Image
            source={{ uri }}
            accessibilityLabel="Receipt photo"
            style={{ width, height: height * 0.8 }}
            resizeMode="contain"
          />
        </ScrollView>
      ) : (
        <Text style={[styles.body, { color: '#FFFFFF', padding: spacing.md }]}>This receipt photo isn't on this phone.</Text>
      )}
    </SafeAreaView>
  );
}
