import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Linking, Platform, Pressable, Text, View } from 'react-native';

import { PaperTape } from './machine';
import { colors, spacing } from './theme';
import { Button, styles } from './ui';
import { receiptUri, saveReceipt } from '@/lib/receipts';

// Attach, view, replace or remove a receipt photo. `onChange` gets the new
// photo's file name, or undefined when it's removed. The caller decides when
// files are deleted, since an edit can still be cancelled.
export function ReceiptField({ value, onChange }: { value?: string; onChange: (name: string | undefined) => void }) {
  const router = useRouter();
  const uri = value ? receiptUri(value) : null;

  async function pick(source: 'camera' | 'library') {
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera is off for Abacus', 'Allow camera access in your phone settings to photograph receipts.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
          return;
        }
      }
      // Receipts only need to be readable, so a smaller file keeps backups light.
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5 };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      onChange(await saveReceipt(result.assets[0].uri));
    } catch (e) {
      Alert.alert('Could not add the receipt', String(e instanceof Error ? e.message : e));
    }
  }

  const pickers = (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <Button title={value ? 'Retake' : 'Take photo'} variant="secondary" onPress={() => pick('camera')} />
      </View>
      <View style={{ flex: 1 }}>
        <Button title={value ? 'Replace' : 'Choose photo'} variant="secondary" onPress={() => pick('library')} />
      </View>
    </View>
  );

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>Receipt (optional)</Text>
      {value && (
        <PaperTape style={{ marginBottom: spacing.sm }}>
          {uri ? (
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel="Receipt photo. Tap to view full size."
              onPress={() => router.push({ pathname: '/receipt', params: { name: value } })}
            >
              <Image source={{ uri }} style={{ height: 180, borderRadius: 2 }} resizeMode="cover" />
              <Text style={[styles.muted, { marginTop: spacing.xs }]}>Tap to view full size</Text>
            </Pressable>
          ) : (
            <Text style={[styles.muted, { color: colors.warning }]}>
              This receipt photo isn't on this phone. It may have been left out of the backup it came from.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(undefined)}
            hitSlop={8}
            style={{ alignSelf: 'flex-start', marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={[styles.body, { color: colors.danger }]}>Remove receipt</Text>
          </Pressable>
        </PaperTape>
      )}
      {pickers}
      {!value && <Text style={styles.muted}>Photos stay on this phone. They're never uploaded.</Text>}
    </View>
  );
}
