import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeDisplay } from '@/components/HomeDisplay';
import { Fab } from '@/components/Fab';
import {
  digits,
  Display,
  Key,
  KeyLabel,
  keyColors,
  PaperTape,
  PrintIn,
  tape,
  TapeNote,
  TickBar,
} from '@/components/machine';
import { colors, fonts, machine, radius, spacing, type } from '@/components/theme';
import { SectionTitle, styles } from '@/components/ui';
import { billsBetween, nextSevenDays } from '@/lib/analysis';
import { billKey, billsInMonth, billStatus, type EnvelopeMonth } from '@/lib/budget';
import { monthLabel, shortDateLabel, today, weekdayOf } from '@/lib/dates';
import { useHomeNumbers } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { month, summary, todayDay, totalAvailable, pace, points, fixed } = useHomeNumbers();
  const savings = summary.envelopes.find((e) => e.envelope.isSavings);
  const others = summary.envelopes.filter((e) => !e.envelope.isSavings);
  const bills = useBudget((s) => s.bills);
  const paidBills = useBudget((s) => s.paidBills);
  const overdue = useMemo(() => {
    const paid = new Set(paidBills);
    return billsInMonth(bills, month).filter((o) => billStatus(o.bill.id, o.date, paid, today()) === 'overdue');
  }, [bills, paidBills, month]);
  const homeChart = useBudget((s) => s.homeChart);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.screenTitle, local.month]}>{monthLabel(month)}</Text>

        <Pressable onPress={() => router.push('/spending')} accessibilityRole="button" accessibilityLabel="Spending details">
          <Display>
            <HomeDisplay
              chart={homeChart}
              totalAvailable={totalAvailable}
              pace={pace}
              points={points}
              month={month}
              todayDay={todayDay}
              fixedTotal={fixed.total}
            />
          </Display>
        </Pressable>

        <View style={local.keyRow}>
          <Key
            color="yellow"
            style={{ flex: 1 }}
            onPress={() => router.push('/bills')}
            accessibilityLabel={`Fixed bills: ${formatMoney(fixed.unpaid)} left to pay of ${formatMoney(fixed.total)}`}
          >
            <KeyLabel
              color="yellow"
              label={`Bills left · of ${digits(fixed.total).replace(/\.\d\d$/, '')}`}
              value={digits(fixed.unpaid)}
            />
          </Key>
          <Key style={{ flex: 1 }} onPress={() => router.push('/spending')} accessibilityLabel="Variable spending">
            <KeyLabel label={`Spent · of ${digits(pace.budget).replace(/\.\d\d$/, '')}`} value={digits(pace.spent)} />
          </Key>
        </View>

        <BillsWidget onPress={() => router.push('/bills')} />

        {summary.overAssigned > 0 && (
          <TapeNote>
            Your category limits are {formatMoney(summary.overAssigned)} more than your income, so{' '}
            {savings?.envelope.name ?? 'savings'} started this month below zero. Lower a limit to fix it.
          </TapeNote>
        )}

        {overdue.length > 0 && (
          <TapeNote action="Review" onPress={() => router.push('/bills')}>
            Not marked paid yet: {overdue.map((o) => o.bill.name).join(', ')}
          </TapeNote>
        )}

        {summary.totalCovered > 0 && (
          <TapeNote>
            {formatMoney(summary.totalCovered)} was pulled from {savings?.envelope.name ?? 'savings'} to cover{' '}
            {summary.envelopes
              .filter((e) => e.coveredBySavings > 0)
              .map((e) => `${e.envelope.name} (${formatMoney(e.coveredBySavings)})`)
              .join(', ')}
          </TapeNote>
        )}

        <SectionTitle>Categories</SectionTitle>
        <PaperTape>
          {others.map((e) => (
            <PrintIn key={e.envelope.id}>
              <TapeRow row={e} onPress={() => router.push(`/envelope/${e.envelope.id}`)} />
            </PrintIn>
          ))}
          <View style={[tape.line, tape.total]}>
            <Text style={tape.name}>LEFT</Text>
            <Text style={tape.name}>{digits(others.reduce((t, e) => t + e.available, 0))} *</Text>
          </View>
        </PaperTape>
        <Pressable
          onPress={() => router.push('/new-envelope')}
          style={local.addButton}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={local.add}>+ ADD CATEGORY</Text>
        </Pressable>

        {savings && (
          <>
            <SectionTitle>Savings</SectionTitle>
            <PaperTape>
              <TapeRow row={savings} onPress={() => router.push(`/envelope/${savings.envelope.id}`)} />
            </PaperTape>
            <Text style={styles.muted}>
              Gets whatever income your other categories don't use, covers any category that runs out, and carries its balance
              month to month.
            </Text>
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push('/add-expense')} />
    </View>
  );
}

// One envelope printed on the tape: name and what's left, a bar of ink blocks, then the detail.
function TapeRow({ row, onPress }: { row: EnvelopeMonth; onPress: () => void }) {
  const budget = row.limit + row.rollover + row.transfersIn - row.transfersOut;
  // Includes money the savings envelope handed to other envelopes.
  const used = budget - row.available;
  const negative = row.available < 0;
  // Red only when money ran out, not when bills used the envelope exactly as planned.
  const red = negative || row.coveredBySavings > 0;
  const ink = red ? { color: colors.danger } : undefined;
  const detail = row.envelope.isSavings
    ? `${digits(row.limit)} added · ${digits(row.rollover)} carried${row.goalsSetAside > 0 ? ` · ${digits(row.goalsSetAside)} to goals` : ''}`
    : `${digits(row.spent)} spent${row.billsSetAside > 0 ? ` · ${digits(row.billsSetAside)} bills` : ''} of ${digits(budget)}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.envelope.name}, ${formatMoney(row.available)} left${red ? ', over budget' : ''}. ${detail}`}
      style={tape.row}
    >
      <View style={tape.line}>
        <Text style={[tape.name, ink, { flex: 1 }]} numberOfLines={1}>
          {row.envelope.name.toUpperCase()}
        </Text>
        <Text style={[tape.name, ink]}>
          {digits(row.available)} {red ? '◆' : '+'}
        </Text>
      </View>
      <TickBar fraction={budget > 0 ? used / budget : negative ? 1 : 0} red={red} />
      <Text style={[tape.caption, red && { color: colors.danger }]}>
        {red ? (negative ? 'Over · ' : 'Covered by savings · ') : ''}
        {detail}
      </Text>
    </Pressable>
  );
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The next seven days as a row of keys; days with a bill due are yellow. Tapping opens the bills calendar.
function BillsWidget({ onPress }: { onPress: () => void }) {
  const bills = useBudget((s) => s.bills);
  const paidBills = useBudget((s) => s.paidBills);
  const todayDate = today();
  const week = useMemo(() => nextSevenDays(todayDate), [todayDate]);
  const upcoming = useMemo(() => billsBetween(bills, week[0], week[6]), [bills, week]);
  const total = upcoming.reduce((t, o) => t + o.bill.amount, 0);
  const paid = new Set(paidBills);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Bills details" style={{ marginTop: spacing.xl }}>
      <View style={styles.row}>
        <Text style={local.label}>Bills this week</Text>
        <Text style={local.label}>
          {upcoming.length === 0
            ? 'None due'
            : `${digits(total)} · ${upcoming.length} ${upcoming.length === 1 ? 'bill' : 'bills'}`}
        </Text>
      </View>
      <View style={local.week}>
        {week.map((date) => {
          const due = upcoming.filter((o) => o.date === date);
          const amount = due.reduce((t, o) => t + o.bill.amount, 0);
          const isToday = date === todayDate;
          const key = keyColors(due.length ? 'yellow' : 'grey');
          return (
            <View key={date} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={local.weekday}>{WEEKDAY[weekdayOf(date)]}</Text>
              <View
                style={[
                  local.dayKey,
                  { backgroundColor: key.face, borderBottomColor: key.edge },
                  isToday && { borderWidth: 2, borderColor: machine.red, borderBottomWidth: 4, borderBottomColor: machine.red },
                ]}
              >
                <Text style={[local.dayNum, { color: key.text }]}>{Number(date.slice(8, 10))}</Text>
              </View>
              <Text style={local.dayAmount}>{amount ? formatMoney(amount, { showCents: false }) : ''}</Text>
            </View>
          );
        })}
      </View>
      {upcoming.length > 0 && (
        <PaperTape style={{ marginTop: spacing.xs }}>
          {upcoming.slice(0, 3).map((o) => {
            const isPaid = paid.has(billKey(o.bill.id, o.date));
            return (
              <View key={`${o.bill.id}${o.date}`} style={[tape.line, { paddingVertical: spacing.xs }]}>
                <Text style={[tape.text, isPaid && { color: colors.muted }, { flex: 1 }]} numberOfLines={1}>
                  {o.bill.name.toUpperCase()} · {shortDateLabel(o.date).toUpperCase()}
                </Text>
                <Text style={[tape.text, isPaid && { color: colors.muted }]}>
                  {digits(o.bill.amount)} {isPaid ? '✓' : '−'}
                </Text>
              </View>
            );
          })}
          {upcoming.length > 3 && <Text style={tape.caption}>And {upcoming.length - 3} more</Text>}
        </PaperTape>
      )}
    </Pressable>
  );
}

const local = StyleSheet.create({
  month: { marginBottom: spacing.md, paddingHorizontal: 2 },
  keyRow: { flexDirection: 'row', gap: spacing.sm + 4, marginTop: spacing.md },
  label: { fontFamily: fonts.bold, ...type.label, fontSize: 12, color: colors.muted, textTransform: 'uppercase' },
  week: { flexDirection: 'row', gap: 6, marginTop: spacing.sm + 2 },
  weekday: { fontFamily: fonts.bold, ...type.label, color: colors.muted, marginBottom: 4 },
  dayKey: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: radius.key - 2,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontFamily: fonts.display, fontSize: 17 },
  dayAmount: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, minHeight: 16, marginTop: 4 },
  addButton: { minHeight: 44, justifyContent: 'center' },
  add: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.4, color: colors.accent },
});
