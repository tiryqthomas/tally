import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, type LayoutChangeEvent } from 'react-native';
import { motionAllowed } from './machine';
import { colors, motion } from './theme';

const BEADS = 10;
// Rounded beads, like pills threaded on the string.
const BEAD_W = 12;
const BEAD_H = 16;
const GAP = 2;
const post = { position: 'absolute', width: 3, height: 14, borderRadius: 2 } as const;

// One rod of an abacus: ten beads, each a tenth of the budget. Beads for what's been used slide
// to the left, beads for what's left wait on the right, in outline. Beads and string are drawn in
// the category's color; `hollow` fills the empty beads to match whatever is behind the rod.
// On first view the used beads slide across from the right.
export function AbacusRod({
  fraction,
  color,
  string,
  hollow = colors.card,
}: {
  fraction: number;
  color: string;
  string: string;
  hollow?: string;
}) {
  const used = Math.round(Math.max(0, Math.min(1, fraction)) * BEADS);
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(motionAllowed() ? 0 : 1)).current;
  const started = useRef(false);

  useEffect(() => {
    if (width === 0 || started.current) return;
    started.current = true;
    if (!motionAllowed()) return slide.setValue(1);
    Animated.timing(slide, {
      toValue: 1,
      duration: motion.roll,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [width, slide]);

  const step = BEAD_W + GAP;
  // Where each bead rests: used beads packed from the left edge, the rest packed against the right.
  const restX = (i: number) => (i < used ? i * step : width - (BEADS - i) * step);
  return (
    <View
      style={{ height: BEAD_H + 2, marginTop: 6, marginRight: 6, justifyContent: 'center' }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ height: 3, borderRadius: 2, backgroundColor: string }} />
      {/* The end stop of the rod. */}
      <View style={[post, { right: -6, backgroundColor: string }]} />
      {width > 0 &&
        Array.from({ length: BEADS }, (_, i) => {
          const x = restX(i);
          // Used beads start where they'd sit if nothing had been spent, then slide left.
          const from = i < used ? width - (BEADS - i) * step : x;
          const on = i < used;
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [from, x] }) }],
              }}
            >
              <View
                style={{
                  width: BEAD_W,
                  height: BEAD_H,
                  borderRadius: BEAD_W / 2,
                  backgroundColor: on ? color : hollow,
                  borderWidth: on ? 0 : 2,
                  borderColor: color,
                }}
              />
            </Animated.View>
          );
        })}
    </View>
  );
}
