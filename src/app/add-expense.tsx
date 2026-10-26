import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { digits as asDigits, Display, DisplayDigits, DisplayLabel, DisplayNote, Key } from '@/components/machine';
import { colors, fonts, spacing } from '@/components/theme';
import { Button, Chips, Field, SectionTitle, styles as ui } from '@/components/ui';
import { summarizeMonth } from '@/lib/budget';
import { currentMonth, monthOf, shortDateLabel, toDateString, today } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { keyClick, logged, preloadFeedback } from '@/lib/feedback';
import { formatMoney } from '@/lib/money';
import { selectData, useBudget } from '@/lib/store';

// Laid out like an adding machine, 7-8-9 on top.
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '.'];

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

  useEffect(preloadFeedback, []);

  function press(key: string) {
    keyClick();
    if (key === '⌫') return setDigits((d) => d.slice(0, -1));
    if (key === 'C') return setDigits('');
    // Drop leading zeros so "00" on an empty amount stays empty.
    const next = (digits + key).replace(/^0+(?=\d)/, '');
    // Allow at most one decimal point and two decimal places.
    if (!/^\d{0,7}(\.\d{0,2})?$/.test(next)) return;
    setDigits(next === '.' ? '0.' : next === '0' ? '' : next);
  }

  function save() {
    if (!envelopeId || cents <= 0) return;
    if (existing) {
      updateExpense(existing.id, { envelopeId, amount: cents, note: note.trim() || undefined });
      return router.back();
    }
    const date = day === 'today' ? today() : toDateString(new Date(Date.now() - 86_400_000));
    addExpense({ envelopeId, amount: cents, date, note: note.trim() || undefined });
    logged();

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

      <Display style={{ marginVertical: spacing.md }}>
        <DisplayLabel>{selected ? selected.envelope.name : 'Amount'}</DisplayLabel>
        <View accessibilityLabel={`Amount ${formatMoney(cents)}`}>
          <DisplayDigits size={48}>{digits || '0.'}</DisplayDigits>
        </View>
        <DisplayNote>
          {selected && !existing
            ? `${asDigits(selected.available)} LEFT · ${asDigits(selected.available - cents)} AFTER`
            : ' '}
        </DisplayNote>
      </Display>

      <View style={local.pad}>
        {KEYS.map((k) => (
          <Key key={k} onPress={() => press(k)} style={local.key} accessibilityLabel={k}>
            <Text style={local.keyText}>{k}</Text>
          </Key>
        ))}
        <Key color="light" onPress={() => press('C')} style={local.wideKey} accessibilityLabel="Clear">
          <Text style={[local.keyText, local.darkText]}>C</Text>
        </Key>
        <Key color="light" onPress={() => press('⌫')} style={local.wideKey} accessibilityLabel="Delete last digit">
          <Text style={[local.keyText, local.darkText]}>⌫</Text>
        </Key>
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
        title={cents <= 0 ? 'Enter an amount' : existing ? 'Save changes' : `−=  Spend ${formatMoney(cents)}`}
        variant={existing ? 'primary' : 'spend'}
        onPress={save}
        disabled={cents <= 0 || !envelopeId}
      />
      {existing && <Button title="Delete" variant="danger" onPress={remove} />}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  key: { width: '31.5%', flexGrow: 1, alignItems: 'center', paddingVertical: 12 },
  wideKey: { width: '48%', flexGrow: 1, alignItems: 'center', paddingVertical: 10 },
  keyText: { fontFamily: fonts.display, fontSize: 26, color: '#fff' },
  darkText: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
});
