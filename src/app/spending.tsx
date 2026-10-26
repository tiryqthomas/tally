import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { EnvelopeBars, MonthBars, SpendLineChart } from '@/components/charts';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { colors } from '@/components/theme';
import { Card, SectionTitle, styles } from '@/components/ui';
import { dailySpending, monthlyTotals, spendingByEnvelope, spendingPace } from '@/lib/analysis';
import { currentMonth, daysInMonth, today } from '@/lib/dates';
import { useBudgetData } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';

export default function SpendingScreen() {
  const router = useRouter();
  const data = useBudgetData();
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(thisMonth);

  const days = daysInMonth(month);
  // Past months are complete; the current month runs through today.
  const lastDay = month === thisMonth ? Number(today().slice(8, 10)) : days;
  const pace = useMemo(() => spendingPace(data, month, lastDay), [data, month, lastDay]);
  const points = useMemo(() => dailySpending(data.expenses, month, lastDay), [data.expenses, month, lastDay]);
  const byEnvelope = useMemo(() => spendingByEnvelope(data, month), [data, month]);
  const totals = useMemo(() => monthlyTotals(data, thisMonth, 6), [data, thisMonth]);
  const left = pace.budget - pace.spent;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <MonthSwitcher month={month} onChange={setMonth} max={thisMonth} />

      <Card>
        <Text style={styles.muted}>Variable spending</Text>
        <Text style={styles.big}>{formatMoney(pace.spent)}</Text>
        <Text style={[styles.muted, left < 0 && { color: colors.danger }]}>
          {left >= 0
            ? `${formatMoney(left)} left of ${formatMoney(pace.budget)}`
            : `${formatMoney(-left)} over ${formatMoney(pace.budget)}`}
          {month === thisMonth && ` · ${pace.ahead > 0 ? `${formatMoney(pace.ahead)} ahead of` : `${formatMoney(-pace.ahead)} under`} an even pace`}
        </Text>
        <SpendLineChart points={points} budget={pace.budget} days={days} month={month} height={180} />
      </Card>

      <SectionTitle>By envelope</SectionTitle>
      <Card>
        {byEnvelope.length === 0 ? (
          <Text style={styles.muted}>Nothing logged this month.</Text>
        ) : (
          <EnvelopeBars rows={byEnvelope} onPress={(id) => router.push(`/envelope/${id}`)} />
        )}
      </Card>

      <SectionTitle>Fixed vs variable, last 6 months</SectionTitle>
      <Card>
        <MonthBars totals={totals} selected={month} onSelect={setMonth} />
      </Card>
      <Text style={styles.muted}>
        Fixed is your bills, set aside on the 1st. Variable is everything you log by hand. Tap a month to look at it.
      </Text>
    </ScrollView>
  );
}
