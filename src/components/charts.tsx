import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import type { CategoryMonth, DailyPoint, EnvelopeSpend, MonthTotal } from '@/lib/analysis';
import { monthLabel, parseMonth } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { CategoryColor, Month } from '@/lib/types';
import { CategoryBadge, CategoryRod, OverPill } from './Category';
import { digits, tape } from './machine';
import { categoryShades, chart, colors, fonts, machine, spacing, themed } from './theme';
import { styles as ui } from './ui';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortMonth = (m: Month) => MONTH_SHORT[parseMonth(m).month - 1];

// Cumulative variable spending this month against a pace line: the average of recent months,
// or an even pace toward the budget when there's no history. Drag across it to read any day.
export function SpendLineChart({
  points,
  budget,
  pace,
  paceLabel,
  days,
  month,
  height = 140,
  interactive = true,
  onDisplay = false,
}: {
  points: DailyPoint[];
  budget: number;
  // What the pace says should be spent by the end of each day, day 1 first.
  pace: number[];
  paceLabel: string;
  days: number;
  month: Month;
  height?: number;
  interactive?: boolean;
  // Drawn in the accent ink for the readout at the top of Home.
  onDisplay?: boolean;
}) {
  const ink = onDisplay
    ? { line: machine.digit, pace: machine.digitDim, grid: machine.digitFaint, text: machine.digitDim, dotEdge: colors.background }
    : { line: chart.variable, pace: chart.pace, grid: chart.grid, text: colors.muted, dotEdge: colors.card };
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 10, bottom: 18, left: 2, right: 2 };
  const maxY = Math.max(budget, points.at(-1)?.cumulative ?? 0, pace.at(-1) ?? 0, 1) * 1.08;
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const x = (day: number) => pad.left + ((day - 1) / Math.max(1, days - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / maxY) * plotH;

  const spentPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.cumulative)}`).join(' ');
  const pacePath = pace.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1)},${y(v)}`).join(' ');
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
      {!onDisplay && (
        <Text style={[ui.muted, { minHeight: 18 }]}>
          {shown
            ? `${shortMonth(month)} ${shown.day}: ${formatMoney(shown.cumulative, { showCents: false })} spent so far, ${paceLabel.toLowerCase()} ${formatMoney(pace[shown.day - 1] ?? 0, { showCents: false })}`
            : ' '}
        </Text>
      )}
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
            <Line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={ink.grid} strokeWidth={1} />
            <Line x1={pad.left} x2={width - pad.right} y1={y(budget)} y2={y(budget)} stroke={ink.grid} strokeWidth={1} />
            <Path d={pacePath} stroke={ink.pace} strokeWidth={1.5} strokeDasharray="4 4" fill="none" strokeLinejoin="round" />
            {points.length > 0 && <Path d={spentPath} stroke={ink.line} strokeWidth={onDisplay ? 2.5 : 2} fill="none" strokeLinejoin="round" />}
            {last && <Circle cx={x(last.day)} cy={y(last.cumulative)} r={4} fill={ink.line} stroke={ink.dotEdge} strokeWidth={2} />}
            {shown && (
              <>
                <Line x1={x(shown.day)} x2={x(shown.day)} y1={pad.top} y2={y(0)} stroke={ink.text} strokeWidth={1} />
                <Circle cx={x(shown.day)} cy={y(shown.cumulative)} r={5} fill={ink.line} stroke={ink.dotEdge} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
        <Text style={[local.axis, { left: 0, color: ink.text }]}>{`${Number(mm)}/1`}</Text>
        <Text style={[local.axis, { right: 0, color: ink.text }]}>{`${Number(mm)}/${days}`}</Text>
        <Text style={[local.budgetLabel, { top: Math.max(0, y(budget) - 16), color: ink.text }]}>
          Budget {formatMoney(budget, { showCents: false })}
        </Text>
      </View>
      {!onDisplay && (
        <View style={local.legend}>
          <LegendItem color={chart.variable} label="Spent" />
          <LegendItem color={chart.pace} label={paceLabel} dashed />
        </View>
      )}
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
          <Text key={t.month} style={[ui.muted, { flex: 1, textAlign: 'center', fontFamily: t.month === selected ? fonts.bold : fonts.body }]}>
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

// Variable spending per envelope against its limit, drawn like the category rows on Home:
// name and amount spent, an abacus rod for how much of the limit is used, red when over.
export function EnvelopeBars({ rows, onPress }: { rows: EnvelopeSpend[]; onPress?: (envelopeId: string) => void }) {
  return (
    <View>
      {rows.map((r, i) => {
        const over = r.limit > 0 && r.spent > r.limit;
        const ink = over ? { color: colors.danger } : undefined;
        return (
          <Pressable
            key={r.envelopeId}
            onPress={onPress ? () => onPress(r.envelopeId) : undefined}
            accessibilityRole="button"
            accessibilityLabel={`${r.name}, ${formatMoney(r.spent)} spent${r.limit > 0 ? ` of ${formatMoney(r.limit)}` : ''}${over ? ', over' : ''}`}
            style={[tape.row, tape.withBadge, i > 0 && tape.divider]}
          >
            <CategoryBadge color={r.color} name={r.name} />
            <View style={{ flex: 1 }}>
              <View style={tape.line}>
                <View style={tape.nameLine}>
                  <Text style={tape.name} numberOfLines={1}>
                    {r.name}
                  </Text>
                  {over && <OverPill />}
                </View>
                <Text style={[tape.amount, ink]}>{digits(r.spent)}</Text>
              </View>
              <CategoryRod color={r.color} fraction={r.limit > 0 ? r.spent / r.limit : 1} />
              <Text style={[tape.caption, ink]}>
                {r.limit > 0 ? `${over ? `Over by ${digits(r.spent - r.limit)} · ` : ''}of ${digits(r.limit)}` : 'No limit set'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// This month's spending as a thick ring, one rounded segment per category in its color,
// with the total in the middle.
export function CategoryRing({ rows, size = 200 }: { rows: EnvelopeSpend[]; size?: number }) {
  const total = rows.reduce((t, r) => t + r.spent, 0);
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const around = 2 * Math.PI * radius;
  // Round caps reach past each segment's ends, so leave room for them plus a small gap.
  const gap = rows.length > 1 ? stroke + 10 : 0;
  let start = 0;
  return (
    <View style={{ alignItems: 'center', marginVertical: spacing.sm }} accessible accessibilityLabel={`${formatMoney(total)} spent`}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {rows.map((r) => {
            const length = (r.spent / total) * around;
            const dash = Math.max(length - gap, 0.5);
            const offset = -(start + gap / 2);
            start += length;
            return (
              <Circle
                key={r.envelopeId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={categoryShades(r.color).fill}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${around}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </G>
        <SvgText x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={30} fontFamily={fonts.serif} fill={colors.text}>
          {formatMoney(total, { showCents: false })}
        </SvgText>
        <SvgText x={size / 2} y={size / 2 + 26} textAnchor="middle" fontSize={12} fontFamily={fonts.body} fill={colors.muted}>
          spent
        </SvgText>
      </Svg>
    </View>
  );
}

// One category's last few months as rounded bars in its color, this month solid and earlier
// months lighter, with this month's limit as a dashed line. A red dot marks a month that went over.
export function CategoryMonthBars({ months, color, height = 150 }: { months: CategoryMonth[]; color: CategoryColor | 'savings'; height?: number }) {
  const [width, setWidth] = useState(0);
  const shade = categoryShades(color);
  const limit = months.at(-1)?.limit ?? 0;
  const top = Math.max(limit, ...months.map((m) => m.spent), 1) * 1.12;
  const base = height - 22;
  const y = (v: number) => base - (v / top) * (base - 10);
  const slot = width / Math.max(months.length, 6);
  const bar = Math.min(44, slot * 0.8);
  const r = Math.min(8, bar / 2);
  return (
    <View
      style={{ height, marginTop: spacing.sm }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={months.map((m) => `${monthLabel(m.month)}: ${formatMoney(m.spent)}`).join(', ')}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {months.map((m, i) => {
            const x = i * slot + (slot - bar) / 2;
            const t = Math.min(y(m.spent), base - 2);
            const last = i === months.length - 1;
            const h = base - t;
            const rr = Math.min(r, h);
            return (
              <G key={m.month}>
                <Path
                  d={`M${x} ${base} V${t + rr} Q${x} ${t} ${x + rr} ${t} H${x + bar - rr} Q${x + bar} ${t} ${x + bar} ${t + rr} V${base} Z`}
                  fill={last ? shade.fill : shade.faded}
                />
                {m.limit > 0 && m.spent > m.limit && <Circle cx={x + bar / 2} cy={t - 8} r={3} fill={colors.danger} />}
                <SvgText
                  x={x + bar / 2}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily={last ? fonts.bold : fonts.number}
                  fill={last ? colors.text : colors.muted}
                >
                  {shortMonth(m.month)}
                </SvgText>
              </G>
            );
          })}
          {limit > 0 && <Line x1={0} x2={width} y1={y(limit)} y2={y(limit)} stroke={colors.text} strokeWidth={1.2} strokeDasharray="3 4" strokeLinecap="round" />}
        </Svg>
      )}
    </View>
  );
}

const local = themed(() => StyleSheet.create({
  axis: { position: 'absolute', bottom: 0, fontSize: 11, letterSpacing: 0.1, fontFamily: fonts.number, fontVariant: ['tabular-nums'], color: colors.muted },
  budgetLabel: { position: 'absolute', left: 4, fontSize: 11, letterSpacing: 0.1, fontFamily: fonts.number, fontVariant: ['tabular-nums'], color: colors.muted },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
}));
