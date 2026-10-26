import { useMemo } from 'react';

import type { DailyPoint, Pace } from '@/lib/analysis';
import { daysInMonth, monthLabel } from '@/lib/dates';
import { useBudgetData, useMonthSummary } from '@/lib/hooks';
import { categoryBurn, compareWithLastMonth, dailyAllowance, incomeSplit, type HomeChart } from '@/lib/homeCharts';
import type { Month } from '@/lib/types';
import { SpendLineChart } from './charts';
import { AllowanceBars, CategoryBars, IncomeBar, MonthCompareLines } from './DisplayCharts';
import { digits, DisplayDigits, DisplayLabel, DisplayNote } from './machine';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The headline number and chart on Home's display, for whichever chart is picked in Settings.
export function HomeDisplay({
  chart,
  totalAvailable,
  pace,
  points,
  month,
  todayDay,
  fixedTotal,
}: {
  chart: HomeChart;
  totalAvailable: number;
  pace: Pace;
  points: DailyPoint[];
  month: Month;
  todayDay: number;
  fixedTotal: number;
}) {
  const data = useBudgetData();
  const summary = useMonthSummary(month);
  const days = daysInMonth(month);

  const content = useMemo(() => {
    switch (chart) {
      case 'allowance': {
        const a = dailyAllowance(data, month, todayDay);
        return {
          label: 'Safe to spend today',
          value: digits(a.perDay),
          note: `$${digits(a.left)} left ÷ ${plural(a.daysLeft, 'day')}`,
          body: <AllowanceBars allowance={a} />,
        };
      }
      case 'categories': {
        const rows = categoryBurn(summary, todayDay);
        const over = rows.filter((r) => r.status === 'over').length;
        const ahead = rows.filter((r) => r.status === 'ahead').length;
        return {
          label: 'Categories this month',
          value: over ? `${over} over` : ahead ? `${ahead} ahead` : 'On track',
          note: `${ahead} ahead of pace · ${rows.length - over - ahead} on track`,
          body: <CategoryBars rows={rows} elapsed={todayDay / days} />,
        };
      }
      case 'last-month': {
        const c = compareWithLastMonth(data, month, todayDay);
        const now = c.now.at(-1)?.cumulative ?? 0;
        const diff = now - c.lastBySameDay;
        const lastName = monthLabel(c.lastMonth).split(' ')[0];
        return {
          label: `Spent by day ${todayDay}`,
          value: digits(now),
          note:
            c.lastBySameDay === 0 && (c.last.at(-1)?.cumulative ?? 0) === 0
              ? `Nothing logged in ${lastName}`
              : `$${digits(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${lastName}`,
          body: <MonthCompareLines compare={c} days={days} />,
        };
      }
      case 'income': {
        const split = incomeSplit(data, summary, todayDay, fixedTotal);
        return {
          label: `${monthLabel(month).split(' ')[0]} income`,
          value: digits(split.income),
          note: 'Bills · spent · left · savings',
          body: <IncomeBar split={split} />,
        };
      }
      default: {
        const daysLeft = days - todayDay;
        return {
          label: totalAvailable < 0 ? 'Over budget' : 'Left to spend',
          value: digits(totalAvailable),
          note: `${pace.ahead > 0 ? `$${digits(pace.ahead)} ahead of pace` : `$${digits(-pace.ahead)} under pace`} · ${plural(daysLeft, 'day')} left`,
          body: (
            <SpendLineChart
              points={points}
              budget={pace.budget}
              days={days}
              month={month}
              height={80}
              interactive={false}
              onDisplay
            />
          ),
        };
      }
    }
  }, [chart, data, summary, month, todayDay, days, totalAvailable, pace, points, fixedTotal]);

  return (
    <>
      <DisplayLabel>{content.label}</DisplayLabel>
      <DisplayDigits roll accessibilityLabel={`${content.label}: ${content.value}`}>{content.value}</DisplayDigits>
      <DisplayNote>{content.note}</DisplayNote>
      {content.body}
    </>
  );
}
