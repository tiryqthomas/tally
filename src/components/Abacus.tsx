import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import { motionAllowed } from './machine';
import { colors, motion } from './theme';

const BEADS = 10;
// Soroban beads: two cones joined at their wide edge, seen side-on. The rod runs through the points.
const BEAD_W = 12;
const BEAD_H = 18;
const GAP = 2;
const BICONE = [
  [0, BEAD_H / 2],
  [BEAD_W / 2 - 1.5, 0.75],
  [BEAD_W / 2 + 1.5, 0.75],
  [BEAD_W, BEAD_H / 2],
  [BEAD_W / 2 + 1.5, BEAD_H - 0.75],
  [BEAD_W / 2 - 1.5, BEAD_H - 0.75],
]
  .map((p) => p.join(','))
  .join(' ');
const post = { position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: colors.border } as const;

// One rod of an abacus: ten beads, each a tenth of the budget. Beads for what's been used slide
// to the left, beads for what's left wait on the right. When the budget is gone every bead
// sits on the left in red. On first view the used beads slide across from the right.
export function AbacusRod({ fraction, red }: { fraction: number; red?: boolean }) {
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
  const ink = red ? colors.danger : colors.text;

  return (
    <View
      style={{ height: BEAD_H + 2, marginTop: 6, justifyContent: 'center' }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ height: 1.5, backgroundColor: colors.border }} />
      {/* The frame posts at each end of the rod. */}
      <View style={[post, { left: -4 }]} />
      <View style={[post, { right: -4 }]} />
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
              <Svg width={BEAD_W} height={BEAD_H}>
                <Polygon
                  points={BICONE}
                  fill={on ? ink : colors.card}
                  stroke={on ? ink : colors.accent}
                  strokeWidth={1.25}
                  strokeLinejoin="round"
                />
                {/* The ridge where the two cones meet. */}
                <Line
                  x1={BEAD_W / 2}
                  y1={1.5}
                  x2={BEAD_W / 2}
                  y2={BEAD_H - 1.5}
                  stroke={on ? colors.card : colors.accent}
                  strokeOpacity={on ? 0.35 : 0.5}
                  strokeWidth={1}
                />
              </Svg>
            </Animated.View>
          );
        })}
    </View>
  );
}
