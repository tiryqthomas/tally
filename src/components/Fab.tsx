import { StyleSheet, Text } from 'react-native';

import { keyClick } from '@/lib/feedback';

import { Key } from './machine';
import { fonts } from './theme';

// The big red "−=" key that opens Log spending, pinned to the bottom of the screen.
export function Fab({ onPress, label = 'Log spending' }: { onPress: () => void; label?: string }) {
  return (
    <Key
      color="red"
      onPress={() => {
        keyClick();
        onPress();
      }}
      accessibilityLabel={label}
      style={styles.fab}
    >
      <Text style={styles.text}>−=  {label}</Text>
    </Key>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'center', paddingVertical: 14 },
  text: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1.6, color: '#fff', textTransform: 'uppercase' },
});
