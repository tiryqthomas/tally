import { useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { monthLabel } from "@/lib/dates";
import { snapLimit, type LimitHistory, type MonthUse } from "@/lib/limits";
import { FONT, INK, shortDollars } from "./DisplayCharts";
import { digits } from "./machine";
import { colors } from "./theme";

const HEIGHT = 150;
const TOP = 14;
const BOTTOM = 18;
const PLOT = HEIGHT - TOP - BOTTOM;

const short = (m: string) => monthLabel(m).slice(0, 3);
const used = (u: MonthUse) => u.spent + u.bills;

// Past months as bars with the limit as a line that can be dragged up and down.
export function LimitChart({
  history,
  limit,
  top,
  onChange,
  onDragging,
}: {
  history: LimitHistory;
  limit: number;
  // The amount at the top of the chart. Held steady while dragging.
  top: number;
  onChange: (cents: number) => void;
  onDragging: (dragging: boolean) => void;
}) {
  const [width, setWidth] = useState(0);
  // The pan handler is made once, so it reads the latest values from here.
  const latest = useRef({ limit, top, onChange, onDragging });
  latest.current = { limit, top, onChange, onDragging };
  const start = useRef(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = latest.current.limit;
        latest.current.onDragging(true);
      },
      onPanResponderMove: (_, g) => {
        const { top: t, onChange: set } = latest.current;
        set(Math.min(t, snapLimit(start.current - (g.dy / PLOT) * t)));
      },
      onPanResponderRelease: () => latest.current.onDragging(false),
      onPanResponderTerminate: () => latest.current.onDragging(false),
    }),
  ).current;

  const y = (v: number) => TOP + PLOT - (Math.min(v, top) / top) * PLOT;
  const bars = [
    ...history.past.map((u) => ({ u, now: false })),
    { u: history.current, now: true },
  ];
  const step = 1000;
  const label =
    `Monthly limit ${digits(limit)}. ` +
    (history.past.length
      ? `Average ${digits(history.average)} over the last ${history.past.length} months. `
      : "") +
    "Drag up or down to change it.";

  return (
    <View
      style={{ height: HEIGHT, marginTop: 10 }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        onChange(
          Math.min(
            top,
            Math.max(
              0,
              limit + (e.nativeEvent.actionName === "increment" ? step : -step),
            ),
          ),
        )
      }
      {...pan.panHandlers}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {bars.map(({ u, now }, i) => {
            const slot = (width - 70) / 4;
            const x = 70 + i * slot + slot * 0.18;
            const w = slot * 0.64;
            const over = used(u) > limit;
            return (
              <G key={u.month} opacity={now ? 0.55 : 1}>
                <Rect
                  x={x}
                  y={y(used(u))}
                  width={w}
                  height={y(0) - y(used(u))}
                  fill={over ? INK.red : INK.line}
                />
                {u.bills > 0 && (
                  <Rect
                    x={x}
                    y={y(u.bills)}
                    width={w}
                    height={y(0) - y(u.bills)}
                    fill={INK.blue}
                  />
                )}
                <SvgText
                  x={x + w / 2}
                  y={HEIGHT - 3}
                  fill={INK.dim}
                  textAnchor="middle"
                  {...FONT}
                >
                  {now ? "NOW" : short(u.month)}
                </SvgText>
              </G>
            );
          })}
          {history.past.length > 0 && (
            <>
              <Line
                x1={0}
                x2={width}
                y1={y(history.average)}
                y2={y(history.average)}
                stroke={INK.dim}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <SvgText
                x={0}
                y={y(history.average) + 13}
                fill={INK.dim}
                {...FONT}
              >
                {`Avg ${shortDollars(history.average)}`}
              </SvgText>
            </>
          )}
          <Line
            x1={0}
            x2={width}
            y1={y(limit)}
            y2={y(limit)}
            stroke={INK.yellow}
            strokeWidth={2.5}
          />
          <Rect
            x={width - 62}
            y={y(limit) - 9}
            width={62}
            height={18}
            rx={4}
            fill={INK.yellow}
          />
          <SvgText
            x={width - 31}
            y={y(limit) + 4}
            fill={colors.onInk}
            textAnchor="middle"
            {...FONT}
            fontSize={12}
          >
            {`↕ ${shortDollars(limit)}`}
          </SvgText>
          {history.past.length === 0 && (
            <SvgText x={0} y={TOP} fill={INK.dim} {...FONT}>
              No past months yet
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}
