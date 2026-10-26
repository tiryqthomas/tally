import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { digits, PaperTape, PrintIn, tape } from '@/components/machine';
import { colors, fonts, spacing, type } from '@/components/theme';
import { Chips, styles } from '@/components/ui';
import { expensesIn } from '@/lib/analysis';
import { billKey, billsInMonth } from '@/lib/budget';
import { currentMonth, shortDateLabel, today, weekdayOf } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import type { DateString } from '@/lib/types';

type Filter = 'all' | 'spending' | 'bills';

interface Row {
  key: string;
  kind: 'spending' | 'bill';
  date: DateString;
  title: string;
  detail: string;
  amount: number;
  onPress: () => void;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TransactionsScreen() {
  const router = useRouter();
  const expenses = useBudget((s) => s.expenses);
  const bills = useBudget((s) => s.bills);
  const envelopes = useBudget((s) => s.envelopes);
  const paidBills = useBudget((s) => s.paidBills);
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(thisMonth);
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const envelopeName = (id?: string) => envelopes.find((e) => e.id === id)?.name ?? 'No category';
    const paid = new Set(paidBills);
    const todayDate = today();
    const spending: Row[] = expensesIn(expenses, month).map((x) => ({
      key: x.id,
      kind: 'spending',
      date: x.date,
      title: x.note || envelopeName(x.envelopeId),
      detail: `${x.note ? envelopeName(x.envelopeId) : 'Spending'}${x.receipt ? ' · Receipt' : ''}`,
      amount: x.amount,
      onPress: () => router.push({ pathname: '/add-expense', params: { id: x.id } }),
    }));
    // A bill counts once it's been marked paid or its due date has arrived.
    const fixed: Row[] = billsInMonth(bills, month)
      .filter((o) => o.date <= todayDate || paid.has(billKey(o.bill.id, o.date)))
      .map((o) => ({
        key: `${o.bill.id}${o.date}`,
        kind: 'bill',
        date: o.date,
        title: o.bill.name,
        detail: paid.has(billKey(o.bill.id, o.date)) ? 'Bill · paid' : 'Bill · not marked paid',
        amount: o.bill.amount,
        onPress: () => router.push({ pathname: '/bill', params: { id: o.bill.id } }),
      }));
    return [...spending, ...fixed]
      .filter((r) => filter === 'all' || (filter === 'bills' ? r.kind === 'bill' : r.kind === 'spending'))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, bills, envelopes, paidBills, month, filter, router]);

  const groups = useMemo(() => {
    const out: { date: DateString; rows: Row[] }[] = [];
    for (const r of rows) {
      if (out.at(-1)?.date === r.date) out.at(-1)!.rows.push(r);
      else out.push({ date: r.date, rows: [r] });
    }
    return out;
  }, [rows]);

  const total = rows.reduce((t, r) => t + r.amount, 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <MonthSwitcher month={month} onChange={setMonth} max={thisMonth} />
        <Chips
          options={[
            { value: 'all', label: 'All' },
            { value: 'spending', label: 'Spending' },
            { value: 'bills', label: 'Bills' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <View style={styles.row}>
          <Text style={styles.muted}>
            {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}
          </Text>
          <Text style={[styles.money, { fontFamily: fonts.numberBold, ...type.headline }]}>{digits(total)}</Text>
        </View>

        {groups.length === 0 && (
          <Text style={[styles.muted, { marginTop: spacing.lg }]}>Nothing here yet. Tap + to log spending.</Text>
        )}
        {groups.map((g) => (
          <View key={g.date}>
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {WEEKDAYS[weekdayOf(g.date)]}, {shortDateLabel(g.date)}
            </Text>
            <PaperTape>
              {g.rows.map((r, i) => (
                <PrintIn key={r.key}>
                  <Pressable
                    onPress={r.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.title}, ${formatMoney(r.amount)}, ${r.detail}`}
                    style={[tape.row, i > 0 && { borderTopWidth: 1, borderStyle: 'dotted', borderTopColor: colors.border }]}
                  >
                    <View style={tape.line}>
                      <Text style={[tape.name, { flex: 1 }]} numberOfLines={1}>
                        {r.title}
                      </Text>
                      <Text style={tape.amount}>−{digits(r.amount)}</Text>
                    </View>
                    <Text style={tape.caption}>{r.detail}</Text>
                  </Pressable>
                </PrintIn>
              ))}
            </PaperTape>
          </View>
        ))}
      </ScrollView>
      <Fab onPress={() => router.push('/add-expense')} />
    </View>
  );
}
