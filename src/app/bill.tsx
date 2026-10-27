import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { MonthCalendar } from '@/components/MonthCalendar';
import { spacing, useScheme } from '@/components/theme';
import { Button, Chips, Field, SectionTitle, styles } from '@/components/ui';
import { isActive } from '@/lib/budget';
import { currentMonth, monthOf, today } from '@/lib/dates';
import { parseMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import type { BillFrequency } from '@/lib/types';

const FREQUENCIES: { value: BillFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
];

// Add a new bill, or edit one when an id is passed.
export default function BillScreen() {
  useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const existing = useBudget((s) => s.bills.find((b) => b.id === params.id));
  const envelopes = useBudget((s) => s.envelopes).filter((e) => isActive(e, currentMonth()));
  const accounts = useBudget((s) => s.accounts);
  const { saveBill, deleteBill } = useBudget.getState();

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? (existing.amount / 100).toFixed(2) : '');
  const [frequency, setFrequency] = useState<BillFrequency>(existing?.frequency ?? 'monthly');
  const [date, setDate] = useState(existing?.startDate ?? params.date ?? today());
  const [calendarMonth, setCalendarMonth] = useState(monthOf(date));
  const [envelopeId, setEnvelopeId] = useState(existing?.envelopeId ?? envelopes.find((e) => !e.isSavings)?.id);
  const [accountId, setAccountId] = useState(existing?.accountId);

  function save() {
    const cents = parseMoney(amount);
    if (!name.trim() || !cents || !envelopeId) {
      Alert.alert('Add a name, an amount and a category.');
      return;
    }
    saveBill({ id: existing?.id, name: name.trim(), amount: cents, frequency, startDate: date, envelopeId, accountId });
    router.back();
  }

  function remove() {
    if (!existing) return;
    Alert.alert(`Delete ${existing.name}?`, 'It stops being set aside from now on.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteBill(existing.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit bill' : 'New bill' }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Rent, Netflix" />
        <Field label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />

        <SectionTitle>Repeats</SectionTitle>
        <Chips options={FREQUENCIES} value={frequency} onChange={setFrequency} />

        <SectionTitle>{existing ? 'First due date' : 'Next due date'}</SectionTitle>
        <MonthCalendar month={calendarMonth} onChangeMonth={setCalendarMonth} selected={date} onSelect={setDate} />

        <SectionTitle>Paid from category</SectionTitle>
        <Chips options={envelopes.map((e) => ({ value: e.id, label: e.name }))} value={envelopeId} onChange={setEnvelopeId} />

        <SectionTitle>Comes out of account</SectionTitle>
        {accounts.length === 0 ? (
          <Text style={[styles.muted, { marginBottom: spacing.md }]}>Add accounts in Settings to track where bills are pulled from.</Text>
        ) : (
          <Chips options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} />
        )}

        <Button title={existing ? 'Save bill' : 'Add bill'} onPress={save} />
        {existing && <Button title="Delete bill" variant="danger" onPress={remove} />}
      </ScrollView>
    </>
  );
}
