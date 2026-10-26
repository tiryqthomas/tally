import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { DailyPoint, EnvelopeSpend, MonthTotal } from '@/lib/analysis';
import { monthLabel, parseMonth } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { Month } from '@/lib/types';
import { chart, colors, spacing } from './theme';
import { styles as ui } from './ui';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortMonth = (m: Month) => MONTH_SHORT[parseMonth(m).month - 1];

// Cumulative variable spending this month against an even pace toward the budget.
// Drag across it to read any day.
export function SpendLineChart({
  points,
  budget,
  days,
  month,
  height = 140,
  interactive = true,
}: {
  points: DailyPoint[];
  budget: number;
  days: number;
  month: Month;
  height?: number;
  interactive?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 10, bottom: 18, left: 2, right: 2 };
  const maxY = Math.max(budget, points.at(-1)?.cumulative ?? 0, 1) * 1.08;
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const x = (day: number) => pad.left + ((day - 1) / Math.max(1, days - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / maxY) * plotH;

  const spentPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.cumulative)}`).join(' ');
  const last = points.at(-1);
  const shown = hover !== null ? points[hover] : null;

  function track(e: GestureResponderEvent) {
    if (!interactive || points.length === 0 || plotW === 0) return;
    const day = Math.round(((e.nativeEvent.locationX - pad.left) / plotW) * (days - 1)) + 1;
    setHover(Math.max(0, Math.min(points.length - 1, day - 1)));
  }

  const [, mm] = month.split('-');
  return (
    <View>
      <Text style={[ui.muted, { minHeight: 18 }]}>
        {shown
          ? `${shortMonth(month)} ${shown.day}: ${formatMoney(shown.cumulative, { showCents: false })} spent so far, pace ${formatMoney(Math.round((budget * shown.day) / days), { showCents: false })}`
          : ' '}
      </Text>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => interactive}
        onMoveShouldSetResponder={() => interactive}
        onResponderGrant={track}
        onResponderMove={track}
        onResponderRelease={() => setHover(null)}
        onResponderTerminate={() => setHover(null)}
        accessibilityLabel={`Spending so far ${formatMoney(last?.cumulative ?? 0)} of ${formatMoney(budget)} budget`}
        style={{ height }}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={chart.grid} strokeWidth={1} />
            <Line x1={pad.left} x2={width - pad.right} y1={y(budget)} y2={y(budget)} stroke={chart.grid} strokeWidth={1} />
            <Line x1={x(1)} y1={y(0)} x2={x(days)} y2={y(budget)} stroke={chart.pace} strokeWidth={1.5} strokeDasharray="4 4" />
            {points.length > 0 && <Path d={spentPath} stroke={chart.variable} strokeWidth={2} fill="none" strokeLinejoin="round" />}
            {last && <Circle cx={x(last.day)} cy={y(last.cumulative)} r={4} fill={chart.variable} stroke="#fff" strokeWidth={2} />}
            {shown && (
              <>
                <Line x1={x(shown.day)} x2={x(shown.day)} y1={pad.top} y2={y(0)} stroke={colors.muted} strokeWidth={1} />
                <Circle cx={x(shown.day)} cy={y(shown.cumulative)} r={5} fill={chart.variable} stroke="#fff" strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
        <Text style={[local.axis, { left: 0 }]}>{`${Number(mm)}/1`}</Text>
        <Text style={[local.axis, { right: 0 }]}>{`${Number(mm)}/${days}`}</Text>
        <Text style={[local.budgetLabel, { top: Math.max(0, y(budget) - 16) }]}>
          Budget {formatMoney(budget, { showCents: false })}
        </Text>
      </View>
      <View style={local.legend}>
        <LegendItem color={chart.variable} label="Spent" />
        <LegendItem color={chart.pace} label="Even pace" dashed />
      </View>
    </View>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 14,
          height: dashed ? 0 : 3,
          borderRadius: 2,
          backgroundColor: dashed ? undefined : color,
          borderTopWidth: dashed ? 2 : 0,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: color,
        }}
      />
      <Text style={ui.muted}>{label}</Text>
    </View>
  );
}

// Fixed (bills) and variable (logged) spending per month, stacked. Tap a month to read it.
export function MonthBars({ totals, selected, onSelect }: { totals: MonthTotal[]; selected: Month; onSelect: (m: Month) => void }) {
  const max = Math.max(1, ...totals.map((t) => t.fixed + t.variable));
  const height = 120;
  const current = totals.find((t) => t.month === selected);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 8 }}>
        {totals.map((t) => {
          const isSel = t.month === selected;
          const fixedH = (t.fixed / max) * height;
          const varH = (t.variable / max) * height;
          return (
            <Pressable
              key={t.month}
              onPress={() => onSelect(t.month)}
              accessibilityLabel={`${monthLabel(t.month)}: ${formatMoney(t.fixed)} fixed, ${formatMoney(t.variable)} variable`}
              style={{ flex: 1, height, justifyContent: 'flex-end', opacity: isSel ? 1 : 0.55 }}
            >
              {varH > 0 && <View style={{ height: varH, backgroundColor: chart.variable, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />}
              {varH > 0 && fixedH > 0 && <View style={{ height: 2 }} />}
              {fixedH > 0 && (
                <View
                  style={{
                    height: fixedH,
                    backgroundColor: chart.fixed,
                    borderTopLeftRadius: varH > 0 ? 0 : 4,
                    borderTopRightRadius: varH > 0 ? 0 : 4,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {totals.map((t) => (
          <Text key={t.month} style={[ui.muted, { flex: 1, textAlign: 'center', fontWeight: t.month === selected ? '700' : '400' }]}>
            {shortMonth(t.month)}
          </Text>
        ))}
      </View>
      <View style={local.legend}>
        <LegendItem color={chart.fixed} label={`Fixed ${current ? formatMoney(current.fixed, { showCents: false }) : ''}`} />
        <LegendItem color={chart.variable} label={`Variable ${current ? formatMoney(current.variable, { showCents: false }) : ''}`} />
      </View>
    </View>
  );
}

// Variable spending per envelope against its limit.
export function EnvelopeBars({ rows, onPress }: { rows: EnvelopeSpend[]; onPress?: (envelopeId: string) => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((r) => {
        const over = r.limit > 0 && r.spent > r.limit;
        const fraction = r.limit > 0 ? Math.min(1, r.spent / r.limit) : 1;
        return (
          <Pressable key={r.envelopeId} onPress={onPress ? () => onPress(r.envelopeId) : undefined}>
            <View style={ui.row}>
              <Text style={ui.body}>{r.name}</Text>
              <Text style={ui.body}>
                {formatMoney(r.spent, { showCents: false })}
                <Text style={ui.muted}>{r.limit > 0 ? ` of ${formatMoney(r.limit, { showCents: false })}` : ''}</Text>
              </Text>
            </View>
            <View style={[ui.barTrack, { marginTop: 6 }]}>
              <View style={[ui.barFill, { width: `${fraction * 100}%`, backgroundColor: over ? colors.danger : chart.variable }]} />
            </View>
            {over && <Text style={[ui.muted, { color: colors.danger, marginTop: 2 }]}>Over by {formatMoney(r.spent - r.limit)}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const local = StyleSheet.create({
  axis: { position: 'absolute', bottom: 0, fontSize: 11, color: colors.muted },
  budgetLabel: { position: 'absolute', left: 4, fontSize: 11, color: colors.muted },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
});
