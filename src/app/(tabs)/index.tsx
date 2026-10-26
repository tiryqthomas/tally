import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { colors, spacing } from '@/components/theme';
import { Card, ProgressBar, SectionTitle, styles } from '@/components/ui';
import type { EnvelopeMonth } from '@/lib/budget';
import { currentMonth, monthLabel } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';

export default function HomeScreen() {
  const router = useRouter();
  const month = currentMonth();
  const summary = useMonthSummary(month);
  const savings = summary.envelopes.find((e) => e.envelope.isSavings);
  const others = summary.envelopes.filter((e) => !e.envelope.isSavings);
  const totalAvailable = summary.envelopes.reduce((t, e) => t + e.available, 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.muted}>{monthLabel(month)} · left to spend</Text>
        <Text style={[styles.big, totalAvailable < 0 && { color: colors.danger }]}>{formatMoney(totalAvailable)}</Text>

        {summary.unassigned !== 0 && (
          <Card style={{ marginTop: spacing.md, backgroundColor: summary.unassigned > 0 ? colors.accentSoft : colors.dangerSoft }}>
            <Text style={styles.body}>
              {summary.unassigned > 0
                ? `${formatMoney(summary.unassigned)} of income isn't in an envelope yet. Give every dollar a job.`
                : `Your envelope limits are ${formatMoney(-summary.unassigned)} more than your income.`}
            </Text>
          </Card>
        )}

        {summary.totalCovered > 0 && (
          <Card style={{ marginTop: spacing.sm, backgroundColor: colors.dangerSoft }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={[styles.body, { flex: 1 }]}>
                {formatMoney(summary.totalCovered)} was pulled from {savings?.envelope.name ?? 'savings'} this month to
                cover{' '}
                {summary.envelopes
                  .filter((e) => e.coveredBySavings > 0)
                  .map((e) => `${e.envelope.name} (${formatMoney(e.coveredBySavings)})`)
                  .join(', ')}
                .
              </Text>
            </View>
          </Card>
        )}

        <SectionTitle>Envelopes</SectionTitle>
        {others.map((e) => (
          <EnvelopeRow key={e.envelope.id} row={e} onPress={() => router.push(`/envelope/${e.envelope.id}`)} />
        ))}
        <Pressable onPress={() => router.push('/new-envelope')} style={{ paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add envelope</Text>
        </Pressable>

        {savings && (
          <>
            <SectionTitle>Covers overspending</SectionTitle>
            <EnvelopeRow row={savings} onPress={() => router.push(`/envelope/${savings.envelope.id}`)} />
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push('/add-expense')} />
    </View>
  );
}

function EnvelopeRow({ row, onPress }: { row: EnvelopeMonth; onPress: () => void }) {
  const budget = row.limit + row.rollover + row.transfersIn - row.transfersOut;
  const used = row.spent + row.billsSetAside;
  const negative = row.available < 0;
  // Red only when money ran out, not when bills used the envelope exactly as planned.
  const overspent = row.coveredBySavings > 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>{row.envelope.name}</Text>
          <Text style={[styles.title, (negative || overspent) && { color: colors.danger }]}>{formatMoney(row.available)}</Text>
        </View>
        <View style={{ marginVertical: spacing.sm }}>
          <ProgressBar fraction={budget > 0 ? used / budget : negative ? 1 : 0} danger={negative || overspent} />
        </View>
        <Text style={styles.muted}>
          {formatMoney(row.spent)} spent
          {row.billsSetAside > 0 ? ` · ${formatMoney(row.billsSetAside)} for bills` : ''} · of {formatMoney(budget)}
        </Text>
      </Card>
    </Pressable>
  );
}
