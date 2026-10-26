import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { BillCard } from '@/components/BillCard';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Field, SectionTitle, styles } from '@/components/ui';
import { billsInMonth, summarizeMonths } from '@/lib/budget';
import { currentMonth, monthLabel, monthOf, shortDateLabel } from '@/lib/dates';
import { useBudgetData, useMonthSummary } from '@/lib/hooks';
import { formatMoney, parseMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

export default function EnvelopeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const month = currentMonth();
  const summary = useMonthSummary(month);
  const data = useBudgetData();
  // Month-by-month ending balances, newest first, for the savings history.
  const history = useMemo(
    () =>
      summarizeMonths(data, month)
        .flatMap((m) => {
          const e = m.envelopes.find((x) => x.envelope.id === id);
          return e ? [{ month: m.month, start: e.rollover, end: e.available }] : [];
        })
        .reverse(),
    [data, month, id],
  );
  const row = summary.envelopes.find((e) => e.envelope.id === id);
  const expenses = useBudget((s) => s.expenses);
  const bills = useBudget((s) => s.bills);
  const { setEnvelopeLimit, renameEnvelope, archiveEnvelope, deleteExpense } = useBudget.getState();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row?.envelope.name ?? '');
  const [limit, setLimit] = useState(row ? (row.limit / 100).toFixed(2) : '');

  if (!row) {
    return (
      <View style={[styles.screen, { padding: spacing.md }]}>
        <Text style={styles.body}>This envelope no longer exists.</Text>
      </View>
    );
  }

  const envelope = row.envelope;
  const monthExpenses = expenses
    .filter((x) => x.envelopeId === id && monthOf(x.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthBills = billsInMonth(
    bills.filter((b) => b.envelopeId === id),
    month,
  );

  function saveEdits() {
    const cents = parseMoney(limit);
    if (cents === null || !name.trim()) {
      Alert.alert('Check the name and limit', 'The limit should be a dollar amount like 400 or 400.00.');
      return;
    }
    renameEnvelope(envelope.id, name.trim());
    if (!envelope.isSavings && cents !== row!.limit) setEnvelopeLimit(envelope.id, cents);
    setEditing(false);
  }

  function confirmArchive() {
    Alert.alert(
      `Remove ${envelope.name}?`,
      'It disappears from this month on. Past months keep their history. Bills in it should be moved first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            archiveEnvelope(envelope.id);
            router.back();
          },
        },
      ],
    );
  }

  const limitLabel = envelope.isSavings ? 'Left over from income' : 'Monthly limit';
  const lines: [string, number][] = [
    [limitLabel, row.limit],
    ['Rolled over from last month', row.rollover],
    ['Moved in', row.transfersIn],
    ['Moved out', -row.transfersOut],
    ['Bills set aside', -row.billsSetAside],
    ['Spent', -row.spent],
    ['Covered by savings', row.coveredBySavings],
    ['Covered other envelopes', envelope.isSavings ? -summary.totalCovered : 0],
  ];

  return (
    <>
      <Stack.Screen options={{ title: envelope.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.muted}>{monthLabel(month)} · available</Text>
        <Text style={[styles.big, row.available < 0 && { color: colors.danger }]}>{formatMoney(row.available)}</Text>
        {envelope.isSavings && (
          <Text style={[styles.muted, { marginTop: spacing.xs }]}>
            Gets whatever income your other envelopes don't use. When another envelope runs out, the difference comes
            out of this one. The balance carries from month to month.
          </Text>
        )}

        <Card style={{ marginTop: spacing.md }}>
          {lines
            .filter(([label, v]) => v !== 0 || label === limitLabel || label === 'Spent')
            .map(([label, v]) => (
              <View key={label} style={[styles.row, { paddingVertical: 4 }]}>
                <Text style={styles.body}>{label}</Text>
                <Text style={[styles.body, v < 0 && { color: colors.muted }]}>{formatMoney(v)}</Text>
              </View>
            ))}
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Log spending" onPress={() => router.push({ pathname: '/add-expense', params: { envelopeId: envelope.id } })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Move money"
              variant="secondary"
              onPress={() => router.push({ pathname: '/move-money', params: { toEnvelopeId: envelope.id } })}
            />
          </View>
        </View>

        {monthBills.length > 0 && (
          <>
            <SectionTitle>Bills this month</SectionTitle>
            {monthBills.map(({ bill, date }) => (
              <BillCard
                key={`${bill.id}${date}`}
                bill={bill}
                date={date}
                detail="Set aside on the 1st"
                onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}
              />
            ))}
          </>
        )}

        <SectionTitle>Spending this month</SectionTitle>
        {monthExpenses.length === 0 && <Text style={styles.muted}>Nothing logged yet.</Text>}
        {monthExpenses.map((x) => (
          <Pressable
            key={x.id}
            onLongPress={() =>
              Alert.alert('Delete this expense?', `${formatMoney(x.amount)}${x.note ? ` · ${x.note}` : ''}`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(x.id) },
              ])
            }
          >
            <Card>
              <View style={styles.row}>
                <Text style={styles.body}>{x.note || 'Expense'}</Text>
                <Text style={styles.body}>{formatMoney(x.amount)}</Text>
              </View>
              <Text style={styles.muted}>{shortDateLabel(x.date)}</Text>
            </Card>
          </Pressable>
        ))}
        {monthExpenses.length > 0 && <Text style={styles.muted}>Press and hold an expense to delete it.</Text>}

        {envelope.isSavings && (
          <>
            <SectionTitle>Savings over time</SectionTitle>
            <Card>
              {history.map((h, i) => {
                const change = h.end - h.start;
                return (
                  <View key={h.month} style={[styles.row, { paddingVertical: 6 }]}>
                    <Text style={styles.body}>
                      {monthLabel(h.month)}
                      {i === 0 ? ' (so far)' : ''}
                    </Text>
                    <Text style={[styles.body, h.end < 0 && { color: colors.danger }]}>
                      {formatMoney(h.end)}
                      <Text style={[styles.muted, { color: change < 0 ? colors.danger : colors.accent }]}>
                        {'  '}
                        {change >= 0 ? '+' : ''}
                        {formatMoney(change, { showCents: false })}
                      </Text>
                    </Text>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        <SectionTitle>Envelope settings</SectionTitle>
        {editing ? (
          <>
            <Field label="Name" value={name} onChangeText={setName} />
            {!envelope.isSavings && (
              <Field label="Monthly limit ($), from this month on" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
            )}
            <Button title="Save" onPress={saveEdits} />
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            <Button
              title={envelope.isSavings ? 'Rename' : 'Edit name or limit'}
              variant="secondary"
              onPress={() => setEditing(true)}
            />
            {!envelope.isSavings && <Button title="Remove envelope" variant="danger" onPress={confirmArchive} />}
          </>
        )}
      </ScrollView>
    </>
  );
}
