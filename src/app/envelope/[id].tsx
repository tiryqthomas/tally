import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BillRow } from '@/components/BillCard';
import { CategoryBadge, CategoryRod } from '@/components/Category';
import { CategoryMonthBars } from '@/components/charts';
import { digits, Display, DisplayDigits, DisplayLabel, DisplayNote, PaperTape, tape } from '@/components/machine';
import { categoryShades, colors, fonts, radius, spacing, themed, type, useScheme } from '@/components/theme';
import { Button, Card, Field, SectionTitle, styles } from '@/components/ui';
import { categoryHistory } from '@/lib/analysis';
import { billsInMonth, summarizeMonths } from '@/lib/budget';
import { colorOf } from '@/lib/categoryColors';
import { currentMonth, monthLabel, monthOf, shortDateLabel } from '@/lib/dates';
import { useBudgetData, useMonthSummary } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import { CATEGORY_COLORS } from '@/lib/types';

export default function EnvelopeDetail() {
  useScheme();
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
  const spendHistory = useMemo(() => categoryHistory(data, id, month), [data, id, month]);
  const row = summary.envelopes.find((e) => e.envelope.id === id);
  const expenses = useBudget((s) => s.expenses);
  const bills = useBudget((s) => s.bills);
  const { renameEnvelope, archiveEnvelope, deleteExpense, setEnvelopeColor } = useBudget.getState();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row?.envelope.name ?? '');

  if (!row) {
    return (
      <View style={[styles.screen, { padding: spacing.md }]}>
        <Text style={styles.body}>This category no longer exists.</Text>
      </View>
    );
  }

  const envelope = row.envelope;
  const color = colorOf(envelope);
  const shade = categoryShades(color);
  const budget = row.limit + row.rollover + row.transfersIn - row.transfersOut;
  const monthExpenses = expenses
    .filter((x) => x.envelopeId === id && monthOf(x.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthBills = billsInMonth(
    bills.filter((b) => b.envelopeId === id),
    month,
  );

  function saveEdits() {
    if (!name.trim()) return;
    renameEnvelope(envelope.id, name.trim());
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
    [row.goalsSetAside < 0 ? 'Returned from goals' : 'Set aside for goals', -row.goalsSetAside],
    ['Spent', -row.spent],
    ['Covered by savings', row.coveredBySavings],
    ['Covered other categories', envelope.isSavings ? -summary.totalCovered : 0],
  ];

  return (
    <>
      {/* The name is the big serif title on the tinted panel, so the bar above stays empty. */}
      <Stack.Screen options={{ title: '', headerLargeTitle: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={[band.panel, { backgroundColor: shade.band }]}>
          <View style={band.titleRow}>
            <CategoryBadge color={color} name={envelope.name} size={40} />
            <Text style={[styles.screenTitle, { flex: 1 }]} numberOfLines={2} accessibilityRole="header">
              {envelope.name}
            </Text>
          </View>
          <DisplayLabel>{row.available < 0 ? 'Over' : 'Left'} in {monthLabel(month)}</DisplayLabel>
          <DisplayDigits roll>{digits(row.available)}</DisplayDigits>
          {envelope.isSavings ? (
            <DisplayNote>Carries over month to month</DisplayNote>
          ) : (
            <>
              <Text style={band.note}>
                {digits(row.spent)} spent of {digits(budget)}
              </Text>
              <CategoryRod color={color} fraction={budget > 0 ? (budget - row.available) / budget : row.available < 0 ? 1 : 0} hollow={shade.band} />
            </>
          )}
        </View>

        {!envelope.isSavings && spendHistory.months.length > 0 && (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.row}>
              <Text style={styles.title}>
                {spendHistory.months.length === 1 ? 'This month' : `Last ${spendHistory.months.length} months`}
              </Text>
              {row.limit > 0 && <Text style={band.small}>Limit {formatMoney(row.limit, { showCents: false })}</Text>}
            </View>
            <CategoryMonthBars months={spendHistory.months} color={color} />
            <View style={band.totals}>
              <View style={band.total}>
                <Text style={band.small}>Spent this year</Text>
                <Text style={band.totalValue}>{formatMoney(spendHistory.yearTotal)}</Text>
              </View>
              <View style={band.total}>
                <Text style={band.small}>Average a month</Text>
                <Text style={band.totalValue}>
                  {spendHistory.monthlyAverage === null ? '—' : formatMoney(spendHistory.monthlyAverage)}
                </Text>
              </View>
            </View>
          </Card>
        )}
        {envelope.isSavings && (
          <Text style={[styles.muted, { marginTop: spacing.xs }]}>
            Gets whatever income your other categories don't use. When another category runs out, the difference comes
            out of this one.
          </Text>
        )}

        <Card style={{ marginTop: spacing.md }}>
          {lines
            .filter(([label, v]) => v !== 0 || label === limitLabel || label === 'Spent')
            .map(([label, v]) => (
              <View key={label} style={[styles.row, { paddingVertical: 4 }]}>
                <Text style={styles.body}>{label}</Text>
                <Text style={[styles.money, v < 0 && { color: colors.muted }]}>{digits(v)}</Text>
              </View>
            ))}
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Log expense" onPress={() => router.push({ pathname: '/add-expense', params: { envelopeId: envelope.id } })} />
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
            <PaperTape>
              {monthBills.map(({ bill, date }, i) => (
                <BillRow
                  key={`${bill.id}${date}`}
                  first={i === 0}
                  bill={bill}
                  date={date}
                  detail="Set aside on the 1st"
                  onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}
                />
              ))}
            </PaperTape>
          </>
        )}

        <SectionTitle>Spending this month</SectionTitle>
        {monthExpenses.length === 0 && <Text style={styles.muted}>Nothing logged yet.</Text>}
        {monthExpenses.length > 0 && (
          <PaperTape>
            {monthExpenses.map((x, i) => (
              <Pressable
                key={x.id}
                style={[tape.row, i > 0 && tape.divider]}
                onPress={() => router.push({ pathname: '/add-expense', params: { id: x.id } })}
                onLongPress={() =>
                  Alert.alert('Delete this expense?', `${formatMoney(x.amount)}${x.note ? ` · ${x.note}` : ''}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(x.id) },
                  ])
                }
              >
                <View style={tape.line}>
                  <Text style={[tape.name, { flex: 1 }]} numberOfLines={1}>
                    {x.note || 'Expense'}
                  </Text>
                  <Text style={tape.amount}>−{digits(x.amount)}</Text>
                </View>
                <Text style={tape.caption}>{shortDateLabel(x.date)}</Text>
              </Pressable>
            ))}
          </PaperTape>
        )}
        {monthExpenses.length > 0 && <Text style={styles.muted}>Tap an expense to edit it, or press and hold to delete it.</Text>}

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
                    <Text style={[styles.money, h.end < 0 && { color: colors.danger }]}>
                      {digits(h.end)}
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

        <SectionTitle>Category settings</SectionTitle>
        {editing ? (
          <>
            <Field label="Name" value={name} onChangeText={setName} />
            <Button title="Save" onPress={saveEdits} />
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            {!envelope.isSavings && (
              <Button
                title={`Change limit · ${formatMoney(row.limit, { showCents: false })} a month`}
                onPress={() => router.push({ pathname: '/edit-limit', params: { id: envelope.id } })}
              />
            )}
            <Button title="Rename" variant="secondary" onPress={() => setEditing(true)} />
            {!envelope.isSavings && (
              <View style={{ marginVertical: spacing.sm }}>
                <Text style={[band.small, { marginBottom: spacing.sm }]}>Color</Text>
                <View style={band.swatches} accessibilityRole="radiogroup" accessibilityLabel="Category color">
                  {CATEGORY_COLORS.map((c) => {
                    const on = envelope.color === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setEnvelopeColor(envelope.id, c)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={c}
                        hitSlop={4}
                        style={[band.swatchRing, on && { borderColor: colors.text }]}
                      >
                        <View style={[band.swatch, { backgroundColor: categoryShades(c).fill }]} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            {!envelope.isSavings && <Button title="Remove category" variant="danger" onPress={confirmArchive} />}
          </>
        )}
      </ScrollView>
    </>
  );
}

const band = themed(() =>
  StyleSheet.create({
    panel: { borderRadius: radius.display + 4, padding: spacing.gutter, gap: spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, marginBottom: spacing.sm },
    note: { fontFamily: fonts.body, ...type.caption, color: colors.muted },
    small: { fontFamily: fonts.body, ...type.caption, color: colors.muted },
    totals: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md },
    total: { flex: 1, backgroundColor: colors.background, borderRadius: radius.paper + 2, padding: spacing.md - 2 },
    totalValue: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.text, marginTop: 2, fontVariant: ['tabular-nums'] },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    swatchRing: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    swatch: { width: 26, height: 26, borderRadius: 13 },
  }),
);
