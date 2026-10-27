import { StyleSheet, Text } from 'react-native';

import { Key } from './machine';
import { colors, fonts, radius, themed } from './theme';

// The ink pill that opens Log expense, pinned to the bottom of the screen.
export function Fab({ onPress, label = 'Log expense' }: { onPress: () => void; label?: string }) {
  return (
    <Key onPress={onPress} accessibilityLabel={label} style={styles.fab}>
      <Text style={styles.text}>{label}</Text>
    </Key>
  );
}

const styles = themed(() => StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { fontFamily: fonts.bold, fontSize: 16, color: colors.onInk },
}));
