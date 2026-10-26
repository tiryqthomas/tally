import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncomeForm, incomeFromDraft, type IncomeDraft } from '@/components/IncomeForm';
import { colors, spacing } from '@/components/theme';
import { Button, Card, SectionTitle, styles } from '@/components/ui';
import { monthlyIncome } from '@/lib/budget';
import { formatMoney, parseMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

interface EnvelopeDraft {
  key: number;
  name: string;
  limit: string;
  isSavings: boolean;
}

const STARTERS: EnvelopeDraft[] = [
  { key: 1, name: 'Rent', limit: '', isSavings: false },
  { key: 2, name: 'Groceries', limit: '', isSavings: false },
  { key: 3, name: 'Gas', limit: '', isSavings: false },
  { key: 4, name: 'Savings / Discretionary', limit: '', isSavings: true },
];

export default function Onboarding() {
  const router = useRouter();
  const finishOnboarding = useBudget((s) => s.finishOnboarding);
  const [step, setStep] = useState<'income' | 'envelopes'>('income');
  const [draft, setDraft] = useState<IncomeDraft>({ mode: 'salary', monthly: '', hourlyRate: '', hoursPerWeek: '40' });
  const [envelopes, setEnvelopes] = useState(STARTERS);

  const income = incomeFromDraft(draft);
  const assigned = envelopes.reduce((t, e) => t + (parseMoney(e.limit) ?? 0), 0);
  const unassigned = income ? monthlyIncome(income) - assigned : 0;
  const named = envelopes.filter((e) => e.name.trim());

  const update = (key: number, changes: Partial<EnvelopeDraft>) =>
    setEnvelopes((list) => list.map((e) => (e.key === key ? { ...e, ...changes } : e)));

  function finish() {
    if (!income) return;
    finishOnboarding(
      income,
      named.map((e) => ({ name: e.name.trim(), limit: parseMoney(e.limit) ?? 0, isSavings: e.isSavings })),
    );
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.big, { marginBottom: spacing.sm }]}>Tally</Text>
        {step === 'income' ? (
          <>
            <Text style={[styles.body, { marginBottom: spacing.lg }]}>
              Budget like you're holding cash. Every dollar goes in an envelope, and you log every purchase by hand.
              {'\n\n'}First, how much do you bring home each month?
            </Text>
            <IncomeForm draft={draft} onChange={setDraft} />
            <Button title="Next" onPress={() => setStep('envelopes')} disabled={!income} />
          </>
        ) : (
          <>
            <Text style={[styles.body, { marginBottom: spacing.md }]}>
              Now split your income into envelopes. Set a monthly limit for each. Bills like rent come out of an envelope,
              so make sure its limit covers them. You can add bills on the Bills tab next.
            </Text>
            <Card style={{ backgroundColor: unassigned < 0 ? colors.dangerSoft : colors.accentSoft }}>
              <Text style={styles.body}>
                {unassigned >= 0
                  ? `${formatMoney(unassigned)} left to assign`
                  : `${formatMoney(-unassigned)} more than your income`}
              </Text>
            </Card>

            <SectionTitle>Envelopes</SectionTitle>
            {envelopes.map((e) => (
              <Card key={e.key}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <TextInput
                    value={e.name}
                    onChangeText={(name) => update(e.key, { name })}
                    placeholder="Envelope name"
                    editable={!e.isSavings}
                    style={[styles.input, { flex: 1, minWidth: 0 }]}
                    placeholderTextColor={colors.muted}
                  />
                  <TextInput
                    value={e.limit}
                    onChangeText={(limit) => update(e.key, { limit })}
                    placeholder="$0"
                    keyboardType="decimal-pad"
                    style={[styles.input, { width: 96 }]}
                    placeholderTextColor={colors.muted}
                  />
                </View>
                {e.isSavings ? (
                  <Text style={[styles.muted, { marginTop: spacing.xs }]}>
                    Required. If another envelope runs out, the difference comes out of this one.
                  </Text>
                ) : (
                  <Pressable onPress={() => setEnvelopes((list) => list.filter((x) => x.key !== e.key))}>
                    <Text style={[styles.muted, { marginTop: spacing.xs, color: colors.danger }]}>Remove</Text>
                  </Pressable>
                )}
              </Card>
            ))}
            <Pressable
              onPress={() =>
                setEnvelopes((list) => [
                  ...list.slice(0, -1),
                  { key: Date.now(), name: '', limit: '', isSavings: false },
                  list[list.length - 1],
                ])
              }
              style={{ paddingVertical: spacing.sm, marginBottom: spacing.md }}
            >
              <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add envelope</Text>
            </Pressable>

            <Button title="Start budgeting" onPress={finish} disabled={named.length < 2} />
            <Button title="Back" variant="secondary" onPress={() => setStep('income')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
