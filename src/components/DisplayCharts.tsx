import { useState, type ReactNode } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Allowance, CategoryBurn, IncomeSplit, MonthCompare } from '@/lib/homeCharts';
import { monthLabel } from '@/lib/dates';
import { digits } from './machine';
import { fonts, machine } from './theme';

// Charts drawn in glowing blue for the dark display at the top of Home.

export const INK = {
  line: machine.digit,
  dim: machine.digitDim,
  faint: machine.digitFaint,
  red: '#FF7A6E',
  yellow: machine.yellow,
  blue: '#8EA3E0',
  white: '#F2F3F5',
};

export const FONT = { fontFamily: fonts.display, fontSize: 11 };

// Measures the width it gets and hands it to the drawing.
export function Measured({ height, label, children }: { height: number; label: string; children: (width: number) => ReactNode }) {
  const [width, setWidth] = useState(0);
  return (
    <View
      style={{ height, marginTop: 8 }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={label}
    >
      {width > 0 && children(width)}
    </View>
  );
}

export const shortDollars = (cents: number) => digits(cents).replace(/\.\d\d$/, '');

// The last 14 days as bars, with the daily allowance as a dashed line. Days over it are red.
export function AllowanceBars({ allowance }: { allowance: Allowance }) {
  const { recent, perDay } = allowance;
  const height = 96;
  const max = Math.max(perDay * 1.25, ...recent.map((p) => p.spent), 1);
  return (
    <Measured height={height} label={`Daily spending for the last ${recent.length} days against ${digits(perDay)} a day`}>
      {(w) => {
        const plotH = height - 16;
        const y = (v: number) => plotH - (v / max) * (plotH - 14);
        const slot = w / Math.max(recent.length, 1);
        return (
          <Svg width={w} height={height}>
            {recent.map((p, i) => (
              <Rect
                key={p.day}
                x={i * slot + 2}
                y={p.spent ? y(p.spent) : plotH - 2}
                width={Math.max(2, slot - 4)}
                height={p.spent ? plotH - y(p.spent) : 2}
                fill={p.spent > perDay ? INK.red : INK.line}
                opacity={p.spent ? 1 : 0.35}
              />
            ))}
            <Line x1={0} x2={w} y1={y(perDay)} y2={y(perDay)} stroke={INK.yellow} strokeWidth={1.5} strokeDasharray="4 3" />
            <SvgText x={w} y={y(perDay) - 4} fill={INK.yellow} textAnchor="end" {...FONT}>
              {`${shortDollars(perDay)} / DAY`}
            </SvgText>
            <SvgText x={0} y={height - 2} fill={INK.dim} {...FONT}>
              {`LAST ${recent.length} DAYS`}
            </SvgText>
            <SvgText x={w} y={height - 2} fill={INK.dim} textAnchor="end" {...FONT}>
              TODAY
            </SvgText>
          </Svg>
        );
      }}
    </Measured>
  );
}

// A bar per category against its limit, with a dotted line at how far through the month it is.
export function CategoryBars({ rows, elapsed }: { rows: CategoryBurn[]; elapsed: number }) {
  const shown = rows.slice(0, 5);
  const rowH = 28;
  const height = shown.length * rowH + 14;
  if (shown.length === 0) return <Empty>No categories with a limit yet</Empty>;
  return (
    <Measured height={height} label={shown.map((r) => `${r.name} ${digits(r.spent)} of ${digits(r.limit)}`).join(', ')}>
      {(w) => {
        const bx = Math.min(120, w * 0.38);
        const bw = w - bx;
        return (
          <Svg width={w} height={height}>
            {shown.map((r, i) => {
              const top = i * rowH;
              const ink = r.status === 'over' ? INK.red : r.status === 'ahead' ? INK.yellow : INK.line;
              const fill = r.limit > 0 ? Math.min(1, r.spent / r.limit) : 1;
              return (
                <G key={r.id}>
                  <SvgText x={0} y={top + 11} fill={ink} {...FONT} fontSize={12}>
                    {r.name.toUpperCase().slice(0, 14)}
                  </SvgText>
                  <SvgText x={0} y={top + 23} fill={INK.dim} {...FONT} fontSize={10}>
                    {`${shortDollars(r.spent)} / ${shortDollars(r.limit)}`}
                  </SvgText>
                  <Rect x={bx} y={top + 7} width={bw} height={10} fill={INK.faint} />
                  <Rect x={bx} y={top + 7} width={bw * fill} height={10} fill={ink} />
                </G>
              );
            })}
            <Line
              x1={bx + bw * elapsed}
              x2={bx + bw * elapsed}
              y1={0}
              y2={shown.length * rowH}
              stroke={INK.white}
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
            <SvgText x={bx + bw * elapsed} y={height - 1} fill={machine.label} textAnchor="middle" {...FONT} fontSize={10}>
              TODAY
            </SvgText>
          </Svg>
        );
      }}
    </Measured>
  );
}

// This month's running total against last month's, day by day.
export function MonthCompareLines({ compare, days }: { compare: MonthCompare; days: number }) {
  const { now, last, lastMonth } = compare;
  const height = 100;
  const span = Math.max(days, last.length);
  const max = Math.max(now.at(-1)?.cumulative ?? 0, last.at(-1)?.cumulative ?? 0, 1) * 1.1;
  const lastName = monthLabel(lastMonth).split(' ')[0].slice(0, 3).toUpperCase();
  const hasLast = (last.at(-1)?.cumulative ?? 0) > 0;
  return (
    <Measured
      height={height}
      label={`This month ${digits(now.at(-1)?.cumulative ?? 0)}, last month ${digits(compare.lastBySameDay)} by the same day`}
    >
      {(w) => {
        const plotH = height - 16;
        const x = (day: number) => 4 + ((day - 1) / Math.max(1, span - 1)) * (w - 8);
        const y = (v: number) => plotH - (v / max) * (plotH - 8);
        const path = (pts: { day: number; cumulative: number }[]) =>
          pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.cumulative)}`).join(' ');
        const end = now.at(-1);
        const lastAt = last[Math.min(now.length, last.length) - 1];
        return (
          <Svg width={w} height={height}>
            {hasLast && (
              <Path d={path(last)} stroke={INK.blue} strokeWidth={2} strokeDasharray="5 3" fill="none" opacity={0.85} />
            )}
            {now.length > 0 && <Path d={path(now)} stroke={INK.line} strokeWidth={2.5} fill="none" strokeLinejoin="round" />}
            {hasLast && lastAt && <Circle cx={x(lastAt.day)} cy={y(lastAt.cumulative)} r={3} fill={INK.blue} />}
            {end && <Circle cx={x(end.day)} cy={y(end.cumulative)} r={4} fill={INK.line} />}
            {hasLast && (
              <SvgText x={w} y={12} fill={INK.blue} textAnchor="end" {...FONT}>
                {`- - ${lastName}`}
              </SvgText>
            )}
            <SvgText x={0} y={height - 2} fill={INK.dim} {...FONT}>
              DAY 1
            </SvgText>
            <SvgText x={w} y={height - 2} fill={INK.dim} textAnchor="end" {...FONT}>
              {`DAY ${span}`}
            </SvgText>
          </Svg>
        );
      }}
    </Measured>
  );
}

// One bar split into where the month's income goes.
export function IncomeBar({ split }: { split: IncomeSplit }) {
  const segs = [
    { name: 'BILLS', value: split.bills, color: INK.blue },
    { name: 'SPENT', value: split.spent, color: INK.line },
    { name: 'LEFT', value: split.left, color: INK.faint },
    { name: 'SAVINGS', value: split.savings, color: INK.yellow },
  ];
  const total = Math.max(
    1,
    segs.reduce((t, s) => t + s.value, 0),
  );
  return (
    <View style={{ marginTop: 10 }} accessible accessibilityLabel={segs.map((s) => `${s.name} ${digits(s.value)}`).join(', ')}>
      <View style={{ flexDirection: 'row', height: 26, gap: 2 }}>
        {segs
          .filter((s) => s.value > 0)
          .map((s) => (
            <View
              key={s.name}
              style={{
                flex: s.value / total,
                backgroundColor: s.color,
                borderWidth: s.name === 'LEFT' ? 1 : 0,
                borderColor: INK.line,
                borderStyle: 'dashed',
              }}
            />
          ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 4 }}>
        {segs.map((s) => (
          <View key={s.name} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: s.color,
                borderWidth: s.name === 'LEFT' ? 1 : 0,
                borderColor: INK.line,
              }}
            />
            <Text
              style={{ fontFamily: fonts.display, fontSize: 12, color: INK.line }}
            >{`${s.name} ${shortDollars(s.value)}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.display, fontSize: 13, color: INK.dim, marginTop: 10 }}>{children}</Text>;
}
