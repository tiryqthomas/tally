import { Text } from 'react-native';

import { spacing } from './theme';
import { Chips, Field, styles } from './ui';
import { estimateMonthlyFromHourly, formatMoney, parseMoney } from '@/lib/money';
import type { Income } from '@/lib/types';

export interface IncomeDraft {
  mode: Income['mode'];
  monthly: string;
  hourlyRate: string;
  hoursPerWeek: string;
}

export function draftFromIncome(income: Income): IncomeDraft {
  return income.mode === 'salary'
    ? { mode: 'salary', monthly: income.monthly ? (income.monthly / 100).toFixed(2) : '', hourlyRate: '', hoursPerWeek: '40' }
    : {
        mode: 'hourly',
        monthly: '',
        hourlyRate: (income.hourlyRate / 100).toFixed(2),
        hoursPerWeek: String(income.hoursPerWeek),
      };
}

// Returns null while the draft is incomplete.
export function incomeFromDraft(draft: IncomeDraft): Income | null {
  if (draft.mode === 'salary') {
    const monthly = parseMoney(draft.monthly);
    return monthly ? { mode: 'salary', monthly } : null;
  }
  const hourlyRate = parseMoney(draft.hourlyRate);
  const hoursPerWeek = Number(draft.hoursPerWeek);
  return hourlyRate && hoursPerWeek > 0 && hoursPerWeek <= 168 ? { mode: 'hourly', hourlyRate, hoursPerWeek } : null;
}

export function IncomeForm({ draft, onChange }: { draft: IncomeDraft; onChange: (draft: IncomeDraft) => void }) {
  const income = incomeFromDraft(draft);
  return (
    <>
      <Chips
        options={[
          { value: 'salary', label: 'Salaried' },
          { value: 'hourly', label: 'Hourly' },
        ]}
        value={draft.mode}
        onChange={(mode) => onChange({ ...draft, mode })}
      />
      {draft.mode === 'salary' ? (
        <Field
          label="Take-home pay per month ($)"
          value={draft.monthly}
          onChangeText={(monthly) => onChange({ ...draft, monthly })}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
      ) : (
        <>
          <Field
            label="Take-home pay per hour ($)"
            value={draft.hourlyRate}
            onChangeText={(hourlyRate) => onChange({ ...draft, hourlyRate })}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Field
            label="Typical hours per week"
            value={draft.hoursPerWeek}
            onChangeText={(hoursPerWeek) => onChange({ ...draft, hoursPerWeek })}
            keyboardType="number-pad"
          />
          {income?.mode === 'hourly' && (
            <Text style={[styles.muted, { marginBottom: spacing.md }]}>
              Estimated {formatMoney(estimateMonthlyFromHourly(income.hourlyRate, income.hoursPerWeek))} a month (rate ×
              hours × 52 weeks ÷ 12).
            </Text>
          )}
        </>
      )}
    </>
  );
}
