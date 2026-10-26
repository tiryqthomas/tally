import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/components/theme';
import { Button, Chips, Field, SectionTitle, styles as ui } from '@/components/ui';
import { summarizeMonth } from '@/lib/budget';
import { currentMonth, monthOf, shortDateLabel, toDateString, today } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';
import { selectData, useBudget } from '@/lib/store';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

type DayChoice = 'today' | 'yesterday';

export default function AddExpense() {
  const router = useRouter();
  const params = useLocalSearchParams<{ envelopeId?: string; id?: string }>();
  // Set when editing an expense that was already logged.
  const existing = useBudget((s) => s.expenses.find((x) => x.id === params.id));
  const summary = useMonthSummary(existing ? monthOf(existing.date) : currentMonth());
  const { addExpense, updateExpense, deleteExpense } = useBudget.getState();

  const [envelopeId, setEnvelopeId] = useState(existing?.envelopeId ?? params.envelopeId ?? summary.envelopes[0]?.envelope.id);
  const [digits, setDigits] = useState(existing ? (existing.amount / 100).toFixed(2) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [day, setDay] = useState<DayChoice>('today');

  const cents = digits ? Math.round(Number(digits) * 100) : 0;

  function press(key: string) {
    if (key === '⌫') return setDigits((d) => d.slice(0, -1));
    const next = digits + key;
    // Allow at most one decimal point and two decimal places.
    if (!/^\d{0,7}(\.\d{0,2})?$/.test(next)) return;
    setDigits(next === '.' ? '0.' : next);
  }

  function save() {
    if (!envelopeId || cents <= 0) return;
    if (existing) {
      updateExpense(existing.id, { envelopeId, amount: cents, note: note.trim() || undefined });
      return router.back();
    }
    const date = day === 'today' ? today() : toDateString(new Date(Date.now() - 86_400_000));
    addExpense({ envelopeId, amount: cents, date, note: note.trim() || undefined });

    // Read fresh state so the confirmation reflects the expense just logged.
    const after = summarizeMonth(selectData(useBudget.getState()), monthOf(date));
    const row = after.envelopes.find((e) => e.envelope.id === envelopeId)!;
    const covered = row.coveredBySavings > 0;
    const savings = after.envelopes.find((e) => e.envelope.isSavings);
    Alert.alert(
      `${formatMoney(cents)} from ${row.envelope.name}`,
      covered
        ? `${row.envelope.name} is empty. ${formatMoney(row.coveredBySavings)} has been pulled from ${savings?.envelope.name} to cover it this month.`
        : `${formatMoney(row.available)} left in ${row.envelope.name}.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  function remove() {
    if (!existing) return;
    const done = () => {
      deleteExpense(existing.id);
      router.back();
    };
    // Alerts with buttons don't show on web.
    if (Platform.OS === 'web') return done();
    Alert.alert('Delete this expense?', `${formatMoney(existing.amount)}${existing.note ? ` · ${existing.note}` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: done },
    ]);
  }

  const selected = summary.envelopes.find((e) => e.envelope.id === envelopeId);

  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      {existing && <Stack.Screen options={{ title: 'Edit spending' }} />}
      <SectionTitle>Envelope</SectionTitle>
      <Chips
        options={summary.envelopes.map((e) => ({ value: e.envelope.id, label: e.envelope.name }))}
        value={envelopeId}
        onChange={setEnvelopeId}
      />
      {selected && !existing && <Text style={ui.muted}>{formatMoney(selected.available)} left before this</Text>}

      <Text style={local.amount} accessibilityLabel="Amount">
        ${digits || '0'}
      </Text>

      <View style={local.pad}>
        {KEYS.map((k) => (
          <Pressable key={k} onPress={() => press(k)} style={({ pressed }) => [local.key, pressed && { backgroundColor: colors.border }]}>
            <Text style={local.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>

      {existing ? (
        <Text style={[ui.muted, { marginBottom: spacing.md }]}>Logged {shortDateLabel(existing.date)}</Text>
      ) : (
        <Chips
          options={[
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
          ]}
          value={day}
          onChange={setDay}
        />
      )}
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Where or what" />
      <Button
        title={cents <= 0 ? 'Enter an amount' : existing ? 'Save changes' : `Spend ${formatMoney(cents)}`}
        onPress={save}
        disabled={cents <= 0 || !envelopeId}
      />
      {existing && <Button title="Delete" variant="danger" onPress={remove} />}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  amount: { fontSize: 52, fontWeight: '700', textAlign: 'center', color: colors.text, marginVertical: spacing.lg },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  key: {
    width: '33.333%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  keyText: { fontSize: 26, color: colors.text, fontWeight: '500' },
});
