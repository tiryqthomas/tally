import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BillRow } from '@/components/BillCard';
import { digits, Display, DisplayDigits, DisplayLabel, DisplayNote, PaperTape } from '@/components/machine';
import { MonthCalendar } from '@/components/MonthCalendar';
import { spacing, useScheme } from '@/components/theme';
import { Button, SectionTitle, styles } from '@/components/ui';
import { billsBetween, nextSevenDays } from '@/lib/analysis';
import { billKey, billsInMonth, type BillOccurrence } from '@/lib/budget';
import { currentMonth, monthLabel, shortDateLabel, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import type { DateString } from '@/lib/types';

const sum = (list: BillOccurrence[]) => list.reduce((t, o) => t + o.bill.amount, 0);

export default function BillsScreen() {
  useScheme();
  const router = useRouter();
  const bills = useBudget((s) => s.bills);
  const envelopes = useBudget((s) => s.envelopes);
  const accounts = useBudget((s) => s.accounts);
  const paidBills = useBudget((s) => s.paidBills);
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState<DateString | undefined>();

  const week = useMemo(() => nextSevenDays(today()), []);
  const thisWeek = useMemo(() => billsBetween(bills, week[0], week[6]), [bills, week]);
  const occurrences = useMemo(() => billsInMonth(bills, month), [bills, month]);
  const marked = useMemo(() => new Set(occurrences.map((o) => o.date)), [occurrences]);
  const shown = selected ? occurrences.filter((o) => o.date === selected) : occurrences;
  const unpaid = occurrences.filter((o) => !paidBills.includes(billKey(o.bill.id, o.date)));
  const nameOf = (list: { id: string; name: string }[], id?: string) => list.find((x) => x.id === id)?.name;

  const row = ({ bill, date }: BillOccurrence, i: number) => (
    <BillRow
      key={`${bill.id}${date}`}
      first={i === 0}
      bill={bill}
      date={date}
      detail={[nameOf(envelopes, bill.envelopeId), bill.accountId && `from ${nameOf(accounts, bill.accountId)}`]
        .filter(Boolean)
        .join(' · ')}
      onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}
    />
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Display>
        <DisplayLabel>Due in the next 7 days</DisplayLabel>
        <DisplayDigits roll>{digits(sum(thisWeek))}</DisplayDigits>
        <DisplayNote>
          {thisWeek.length === 0
            ? 'No bills due this week'
            : `${thisWeek.length} ${thisWeek.length === 1 ? 'bill' : 'bills'} · ${shortDateLabel(week[0])} to ${shortDateLabel(week[6])}`}
        </DisplayNote>
      </Display>
      {thisWeek.length > 0 && <PaperTape style={{ marginTop: spacing.md }}>{thisWeek.map(row)}</PaperTape>}

      <SectionTitle>Calendar</SectionTitle>
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
        <Text style={styles.money}>{digits(sum(selected ? shown : occurrences))}</Text>
      </View>
      {!selected && unpaid.length > 0 && (
        <Text style={[styles.muted, { marginTop: spacing.xs }]}>
          {unpaid.length} still to pay · {formatMoney(sum(unpaid))}
        </Text>
      )}

      <SectionTitle>{selected ? 'Bills that day' : 'All bills this month'}</SectionTitle>
      {shown.length === 0 && <Text style={styles.muted}>No bills{selected ? ' on this day' : ' this month'}.</Text>}
      {shown.length > 0 && <PaperTape>{shown.map(row)}</PaperTape>}

      <View style={{ marginTop: spacing.md }}>
        <Button
          title="Add a bill"
          onPress={() => router.push({ pathname: '/bill', params: selected ? { date: selected } : {} })}
        />
      </View>
    </ScrollView>
  );
}
