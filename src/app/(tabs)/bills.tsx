import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BillCard } from '@/components/BillCard';
import { MonthCalendar } from '@/components/MonthCalendar';
import { spacing } from '@/components/theme';
import { Button, SectionTitle, styles } from '@/components/ui';
import { billKey, billsInMonth } from '@/lib/budget';
import { currentMonth, monthLabel, shortDateLabel } from '@/lib/dates';
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
  const paidBills = useBudget((s) => s.paidBills);
  const unpaid = occurrences.filter((o) => !paidBills.includes(billKey(o.bill.id, o.date)));
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
      {!selected && unpaid.length > 0 && (
        <Text style={[styles.muted, { marginTop: spacing.xs }]}>
          {unpaid.length} still to pay · {formatMoney(unpaid.reduce((t, o) => t + o.bill.amount, 0))}
        </Text>
      )}

      <SectionTitle>{selected ? 'Bills that day' : 'All bills this month'}</SectionTitle>
      {shown.length === 0 && <Text style={styles.muted}>No bills{selected ? ' on this day' : ' this month'}.</Text>}
      {shown.map(({ bill, date }) => (
        <BillCard
          key={`${bill.id}${date}`}
          bill={bill}
          date={date}
          detail={[nameOf(envelopes, bill.envelopeId), bill.accountId && `from ${nameOf(accounts, bill.accountId)}`]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}
        />
      ))}

      <View style={{ marginTop: spacing.md }}>
        <Button
          title="Add a bill"
          onPress={() => router.push({ pathname: '/bill', params: selected ? { date: selected } : {} })}
        />
      </View>
    </ScrollView>
  );
}
