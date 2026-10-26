import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { applyKey, Keypad, typedCents } from '@/components/Keypad';
import { digits as asDigits, Display, DisplayDigits, DisplayLabel, DisplayNote } from '@/components/machine';
import { spacing } from '@/components/theme';
import { Button, Card, Chips, Field, SectionTitle, styles as ui } from '@/components/ui';
import { summarizeMonth } from '@/lib/budget';
import { currentMonth, monthLabel, monthOf, shortDateLabel, toDateString, today } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney, parseMoney } from '@/lib/money';
import { selectData, useBudget } from '@/lib/store';

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
  // The inline form for adding a category without leaving this screen.
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const cents = typedCents(digits);
  // Set when editing an expense from an earlier month.
  const pastMonth = existing && monthOf(existing.date) < currentMonth() ? monthOf(existing.date) : undefined;
  const savingsName = summary.envelopes.find((e) => e.envelope.isSavings)?.envelope.name ?? 'Savings';

  function press(key: string) {
    setDigits((d) => applyKey(d, key));
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

  function addCategory() {
    const name = newName.trim();
    const limit = parseMoney(newLimit);
    if (!name || limit === null) return;
    setEnvelopeId(useBudget.getState().addEnvelope(name, limit, existing && monthOf(existing.date)));
    setAdding(false);
    setNewName('');
    setNewLimit('');
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
      <SectionTitle>Category</SectionTitle>
      <Chips
        options={summary.envelopes.map((e) => ({ value: e.envelope.id, label: e.envelope.name }))}
        value={envelopeId}
        onChange={setEnvelopeId}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a category"
            accessibilityState={{ expanded: adding }}
            onPress={() => setAdding((a) => !a)}
            style={[ui.chip, adding && ui.chipSelected]}
          >
            <Text style={[ui.chipText, adding && ui.chipTextSelected]}>{adding ? '×' : '+'}</Text>
          </Pressable>
        }
      />
      {adding && (
        <Card>
          <Field label="New category" value={newName} onChangeText={setNewName} placeholder="e.g. Pets" autoFocus />
          <Field
            label="Monthly limit ($)"
            value={newLimit}
            onChangeText={setNewLimit}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Button
            title="Add category"
            variant="secondary"
            onPress={addCategory}
            disabled={!newName.trim() || parseMoney(newLimit) === null}
          />
          {pastMonth && (
            <Text style={ui.muted}>
              This expense is from {monthLabel(pastMonth)}. The new category starts there with no limit, so{' '}
              {savingsName} covers it that month. The limit applies from this month on.
            </Text>
          )}
        </Card>
      )}

      <Display style={{ marginVertical: spacing.md }}>
        <DisplayLabel>{selected ? selected.envelope.name : 'Amount'}</DisplayLabel>
        <View accessibilityLabel={`Amount ${formatMoney(cents)}`}>
          <DisplayDigits size={48}>{digits || '0.'}</DisplayDigits>
        </View>
        <DisplayNote>
          {selected && !existing ? `${asDigits(selected.available)} LEFT · ${asDigits(selected.available - cents)} AFTER` : ' '}
        </DisplayNote>
      </Display>

      <Keypad onPress={press} />

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
