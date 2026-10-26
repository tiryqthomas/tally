import { StyleSheet, Text } from 'react-native';

import { Key } from './machine';
import { colors, fonts } from './theme';

// The ink "−=" button that opens Log spending, pinned to the bottom of the screen.
export function Fab({ onPress, label = 'Log spending' }: { onPress: () => void; label?: string }) {
  return (
    <Key onPress={onPress} accessibilityLabel={label} style={styles.fab}>
      <Text style={styles.text}>
        <Text style={styles.sign}>−= </Text>
        {label}
      </Text>
    </Key>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { fontFamily: fonts.bold, fontSize: 16, color: '#fff' },
  // The calculator's minus-equals sign, kept as a small nod in the accent's light tint.
  sign: { fontFamily: fonts.keys, color: colors.accentSoft },
});
