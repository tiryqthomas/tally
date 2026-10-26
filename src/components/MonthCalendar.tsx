import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addMonths, dateInMonth, daysInMonth, monthLabel, today, weekdayOf } from '@/lib/dates';
import type { DateString, Month } from '@/lib/types';
import { colors, radius, spacing } from './theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({
  month,
  onChangeMonth,
  marked = new Set(),
  selected,
  onSelect,
}: {
  month: Month;
  onChangeMonth: (month: Month) => void;
  marked?: Set<DateString>;
  selected?: DateString;
  onSelect?: (date: DateString) => void;
}) {
  const firstWeekday = weekdayOf(dateInMonth(month, 1));
  const cells: (DateString | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth(month) }, (_, i) => dateInMonth(month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const todayDate = today();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Previous month" hitSlop={12} onPress={() => onChangeMonth(addMonths(month, -1))}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <Text style={styles.headerText}>{monthLabel(month)}</Text>
        <Pressable accessibilityLabel="Next month" hitSlop={12} onPress={() => onChangeMonth(addMonths(month, 1))}>
          <Ionicons name="chevron-forward" size={22} color={colors.accent} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`w${i}`} style={[styles.cell, styles.weekday]}>
            {d}
          </Text>
        ))}
        {cells.map((date, i) =>
          date ? (
            <Pressable
              key={date}
              onPress={onSelect ? () => onSelect(date) : undefined}
              style={styles.cell}
              accessibilityLabel={date}
            >
              <View style={[styles.day, date === selected && styles.daySelected, date === todayDate && styles.dayToday]}>
                <Text style={[styles.dayText, date === selected && styles.dayTextSelected]}>{Number(date.slice(8))}</Text>
              </View>
              <View style={[styles.dot, marked.has(date) && styles.dotOn]} />
            </Pressable>
          ) : (
            <View key={`e${i}`} style={styles.cell} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerText: { fontSize: 17, fontWeight: '600', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  weekday: { color: colors.muted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.accent },
  dayToday: { borderWidth: 1, borderColor: colors.accent },
  dayText: { fontSize: 15, color: colors.text },
  dayTextSelected: { color: '#fff', fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.warning },
});
