import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MonthCalendar } from '@/components/MonthCalendar';
import { colors, spacing } from '@/components/theme';
import { Button, Card, SectionTitle, styles } from '@/components/ui';
import { billsInMonth } from '@/lib/budget';
import { currentMonth, monthLabel, shortDateLabel, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import type { DateString } from '@/lib/types';

export default function BillsScreen() {
  const router = useRouter();
  const bills = useBudget((s) => s.bills);
  const envelopes = useBudget((s) => s.envelopes);
  const accounts = useBudget((s) => s.accounts);
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState<DateString | undefined>();

  const occurrences = useMemo(() => billsInMonth(bills, month), [bills, month]);
  const marked = useMemo(() => new Set(occurrences.map((o) => o.date)), [occurrences]);
  const shown = selected ? occurrences.filter((o) => o.date === selected) : occurrences;
  const total = occurrences.reduce((t, o) => t + o.bill.amount, 0);
  const nameOf = (list: { id: string; name: string }[], id?: string) => list.find((x) => x.id === id)?.name;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MonthCalendar
        month={month}
        onChangeMonth={(m) => {
          setMonth(m);
          setSelected(undefined);
        }}
        marked={marked}
        selected={selected}
        onSelect={(d) => setSelected(d === selected ? undefined : d)}
      />

      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Text style={styles.muted}>
          {selected ? `Due ${shortDateLabel(selected)}` : `${monthLabel(month)} · set aside on the 1st`}
        </Text>
        <Text style={styles.title}>{formatMoney(selected ? shown.reduce((t, o) => t + o.bill.amount, 0) : total)}</Text>
      </View>

      <SectionTitle>{selected ? 'Bills that day' : 'All bills this month'}</SectionTitle>
      {shown.length === 0 && <Text style={styles.muted}>No bills{selected ? ' on this day' : ' this month'}.</Text>}
      {shown.map(({ bill, date }) => {
        const paid = date <= today();
        return (
          <Pressable key={`${bill.id}${date}`} onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}>
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{bill.name}</Text>
                <Text style={styles.title}>{formatMoney(bill.amount)}</Text>
              </View>
              <Text style={styles.muted}>
                {shortDateLabel(date)} · {nameOf(envelopes, bill.envelopeId) ?? 'No envelope'}
                {bill.accountId ? ` · from ${nameOf(accounts, bill.accountId)}` : ''}
              </Text>
              <Text style={[styles.muted, { color: paid ? colors.accent : colors.warning, marginTop: 2 }]}>
                {paid ? 'Paid' : 'Upcoming'}
              </Text>
            </Card>
          </Pressable>
        );
      })}

      <View style={{ marginTop: spacing.md }}>
        <Button
          title="Add a bill"
          onPress={() => router.push({ pathname: '/bill', params: selected ? { date: selected } : {} })}
        />
      </View>
    </ScrollView>
  );
}
