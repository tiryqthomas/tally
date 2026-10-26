import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { chart, colors, spacing } from '@/components/theme';
import { Card, Chips, SectionTitle, styles } from '@/components/ui';
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
          <Text style={[styles.money, { fontSize: 18 }]}>{formatMoney(total)}</Text>
        </View>

        {groups.length === 0 && (
          <Text style={[styles.muted, { marginTop: spacing.lg }]}>Nothing here yet. Tap + to log spending.</Text>
        )}
        {groups.map((g) => (
          <View key={g.date}>
            <SectionTitle>
              {WEEKDAYS[weekdayOf(g.date)]}, {shortDateLabel(g.date)}
            </SectionTitle>
            <Card style={{ paddingVertical: spacing.xs }}>
              {g.rows.map((r, i) => (
                <Pressable
                  key={r.key}
                  onPress={r.onPress}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                >
                  <Ionicons
                    name={r.kind === 'bill' ? 'calendar-outline' : 'cash-outline'}
                    size={20}
                    color={r.kind === 'bill' ? chart.fixed : chart.variable}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.body} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={styles.muted}>{r.detail}</Text>
                  </View>
                  <Text style={styles.money}>{formatMoney(r.amount)}</Text>
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
      <Fab onPress={() => router.push('/add-expense')} />
    </View>
  );
}
