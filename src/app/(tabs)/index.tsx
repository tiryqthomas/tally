import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpendLineChart } from '@/components/charts';
import { Fab } from '@/components/Fab';
import {
  digits,
  Display,
  DisplayDigits,
  DisplayLabel,
  DisplayNote,
  Key,
  KeyLabel,
  keyColors,
  PaperTape,
  TickBar,
} from '@/components/machine';
import { colors, fonts, machine, spacing } from '@/components/theme';
import { Card, SectionTitle, styles } from '@/components/ui';
import { billsBetween, dailySpending, nextSevenDays, spendingPace } from '@/lib/analysis';
import { billKey, billsInMonth, billStatus, type EnvelopeMonth } from '@/lib/budget';
import { currentMonth, daysInMonth, monthLabel, shortDateLabel, today, weekdayOf } from '@/lib/dates';
import { useBudgetData, useMonthSummary } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const month = currentMonth();
  const summary = useMonthSummary(month);
  const savings = summary.envelopes.find((e) => e.envelope.isSavings);
  const others = summary.envelopes.filter((e) => !e.envelope.isSavings);
  const bills = useBudget((s) => s.bills);
  const paidBills = useBudget((s) => s.paidBills);
  const overdue = useMemo(() => {
    const paid = new Set(paidBills);
    return billsInMonth(bills, month).filter((o) => billStatus(o.bill.id, o.date, paid, today()) === 'overdue');
  }, [bills, paidBills, month]);
  const totalAvailable = summary.envelopes.reduce((t, e) => t + e.available, 0);
  const data = useBudgetData();
  const todayDate = today();
  const todayDay = Number(todayDate.slice(8, 10));
  const pace = useMemo(() => spendingPace(data, month, todayDay), [data, month, todayDay]);
  const points = useMemo(() => dailySpending(data.expenses, month, todayDay), [data.expenses, month, todayDay]);
  // This month's fixed bills, and how much of that isn't marked paid yet.
  const fixed = useMemo(() => {
    const paid = new Set(paidBills);
    const due = billsInMonth(bills, month);
    return {
      total: due.reduce((t, o) => t + o.bill.amount, 0),
      unpaid: due.filter((o) => !paid.has(billKey(o.bill.id, o.date))).reduce((t, o) => t + o.bill.amount, 0),
    };
  }, [bills, paidBills, month]);
  const daysLeft = daysInMonth(month) - todayDay;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
        <View style={local.brandRow}>
          <Text style={local.brand}>TALLY</Text>
          <Text style={local.model}>{monthLabel(month).toUpperCase()}</Text>
        </View>

        <Pressable onPress={() => router.push('/spending')} accessibilityRole="button" accessibilityLabel="Spending details">
          <Display>
            <DisplayLabel>{totalAvailable < 0 ? 'Over budget' : 'Left to spend'}</DisplayLabel>
            <DisplayDigits>{digits(totalAvailable)}</DisplayDigits>
            <DisplayNote>
              {pace.ahead > 0 ? `${digits(pace.ahead)} AHEAD OF PACE` : `${digits(-pace.ahead)} UNDER PACE`}
              {` · ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} LEFT`}
            </DisplayNote>
            <SpendLineChart
              points={points}
              budget={pace.budget}
              days={daysInMonth(month)}
              month={month}
              height={80}
              interactive={false}
              onDisplay
            />
          </Display>
        </Pressable>

        <View style={local.keyRow}>
          <Key
            color="blue"
            style={{ flex: 1 }}
            onPress={() => router.push('/bills')}
            accessibilityLabel={`Fixed bills: ${formatMoney(fixed.unpaid)} left to pay of ${formatMoney(fixed.total)}`}
          >
            <KeyLabel
              color="blue"
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
          <Card style={local.alert}>
            <Text style={styles.body}>
              Your category limits are {formatMoney(summary.overAssigned)} more than your income, so{' '}
              {savings?.envelope.name ?? 'savings'} started this month below zero. Lower a limit to fix it.
            </Text>
          </Card>
        )}

        {overdue.length > 0 && (
          <Pressable onPress={() => router.push('/bills')}>
            <Card style={local.alert}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Ionicons name="calendar" size={20} color={colors.danger} />
                <Text style={[styles.body, { flex: 1 }]}>
                  Not marked paid yet: {overdue.map((o) => o.bill.name).join(', ')}. Tap to review your bills.
                </Text>
              </View>
            </Card>
          </Pressable>
        )}

        {summary.totalCovered > 0 && (
          <Card style={local.alert}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={[styles.body, { flex: 1 }]}>
                {formatMoney(summary.totalCovered)} was pulled from {savings?.envelope.name ?? 'savings'} this month to cover{' '}
                {summary.envelopes
                  .filter((e) => e.coveredBySavings > 0)
                  .map((e) => `${e.envelope.name} (${formatMoney(e.coveredBySavings)})`)
                  .join(', ')}
                .
              </Text>
            </View>
          </Card>
        )}

        <SectionTitle>Categories</SectionTitle>
        <PaperTape>
          {others.map((e) => (
            <TapeRow key={e.envelope.id} row={e} onPress={() => router.push(`/envelope/${e.envelope.id}`)} />
          ))}
          <View style={[local.line, local.total]}>
            <Text style={local.tapeBold}>LEFT</Text>
            <Text style={local.tapeBold}>{digits(others.reduce((t, e) => t + e.available, 0))} *</Text>
          </View>
        </PaperTape>
        <Pressable
          onPress={() => router.push('/new-envelope')}
          style={{ paddingVertical: spacing.sm }}
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
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={local.tapeRow}>
      <View style={local.line}>
        <Text style={[local.tapeBold, ink, { flex: 1 }]} numberOfLines={1}>
          {row.envelope.name.toUpperCase()}
        </Text>
        <Text style={[local.tapeBold, ink]}>
          {digits(row.available)} {red ? '◆' : '+'}
        </Text>
      </View>
      <TickBar fraction={budget > 0 ? used / budget : negative ? 1 : 0} red={red} />
      <Text style={local.tapeSmall}>
        {row.envelope.isSavings
          ? `${digits(row.limit)} ADDED · ${digits(row.rollover)} CARRIED`
          : `${digits(row.spent)} SPENT${row.billsSetAside > 0 ? ` · ${digits(row.billsSetAside)} BILLS` : ''} · OF ${digits(budget)}`}
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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Bills details" style={{ marginTop: spacing.md }}>
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
              <View key={`${o.bill.id}${o.date}`} style={[local.line, { marginTop: 4 }]}>
                <Text style={[local.tape, isPaid && { color: colors.muted }, { flex: 1 }]} numberOfLines={1}>
                  {o.bill.name.toUpperCase()} · {shortDateLabel(o.date).toUpperCase()}
                </Text>
                <Text style={[local.tape, isPaid && { color: colors.muted }]}>
                  {digits(o.bill.amount)} {isPaid ? '✓' : '−'}
                </Text>
              </View>
            );
          })}
          {upcoming.length > 3 && <Text style={[local.tapeSmall, { marginTop: 4 }]}>AND {upcoming.length - 3} MORE</Text>}
        </PaperTape>
      )}
    </Pressable>
  );
}

const local = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  brand: { fontFamily: fonts.brand, fontSize: 28, letterSpacing: 2, color: '#3D4046' },
  model: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: colors.muted },
  keyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  alert: { marginTop: spacing.sm, backgroundColor: colors.dangerSoft },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  week: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  weekday: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, marginBottom: 3 },
  dayKey: {
    alignSelf: 'stretch',
    height: 38,
    borderRadius: 6,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontFamily: fonts.display, fontSize: 16 },
  dayAmount: { fontFamily: fonts.mono, fontSize: 10, color: colors.muted, minHeight: 14, marginTop: 2 },
  tapeRow: { paddingVertical: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  tape: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  tapeBold: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.text },
  tapeSmall: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 3 },
  total: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.muted, paddingTop: 8, marginTop: 4 },
  add: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1.2, color: colors.accent },
});
