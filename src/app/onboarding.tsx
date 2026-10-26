import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncomeForm, incomeFromDraft, type IncomeDraft } from '@/components/IncomeForm';
import { PresetPicker } from '@/components/PresetPicker';
import { colors, fonts, spacing } from '@/components/theme';
import { Button, Card, SectionTitle, styles } from '@/components/ui';
import { monthlyIncome } from '@/lib/budget';
import { formatMoney, parseMoney } from '@/lib/money';
import { STARTER_ENVELOPES } from '@/lib/presets';
import { SAVINGS_NAME, useBudget } from '@/lib/store';

interface EnvelopeDraft {
  key: number;
  name: string;
  limit: string;
}

let nextKey = 1;
const draftEnvelope = (name: string): EnvelopeDraft => ({ key: nextKey++, name, limit: '' });

export default function Onboarding() {
  const router = useRouter();
  const finishOnboarding = useBudget((s) => s.finishOnboarding);
  const [step, setStep] = useState<'income' | 'envelopes'>('income');
  const [draft, setDraft] = useState<IncomeDraft>({ mode: 'salary', monthly: '', hourlyRate: '', hoursPerWeek: '40' });
  const [envelopes, setEnvelopes] = useState(() => STARTER_ENVELOPES.map(draftEnvelope));
  const [showPresets, setShowPresets] = useState(false);

  const income = incomeFromDraft(draft);
  const assigned = envelopes.reduce((t, e) => t + (parseMoney(e.limit) ?? 0), 0);
  const leftover = income ? monthlyIncome(income) - assigned : 0;
  const named = envelopes.filter((e) => e.name.trim());

  const update = (key: number, changes: Partial<EnvelopeDraft>) =>
    setEnvelopes((list) => list.map((e) => (e.key === key ? { ...e, ...changes } : e)));

  function finish() {
    if (!income) return;
    finishOnboarding(
      income,
      named.map((e) => ({ name: e.name.trim(), limit: parseMoney(e.limit) ?? 0 })),
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
              Set a monthly limit for each envelope. Whatever is left goes into {SAVINGS_NAME} automatically, and it
              builds up month to month. Bills like rent come out of an envelope, so make sure its limit covers them.
            </Text>

            <SectionTitle>Envelopes</SectionTitle>
            {envelopes.map((e) => (
              <Card key={e.key}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <TextInput
                    value={e.name}
                    onChangeText={(name) => update(e.key, { name })}
                    placeholder="Envelope name"
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
                <Pressable onPress={() => setEnvelopes((list) => list.filter((x) => x.key !== e.key))}>
                  <Text style={[styles.muted, { marginTop: spacing.xs, color: colors.danger }]}>Remove</Text>
                </Pressable>
              </Card>
            ))}

            <View style={{ flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.sm }}>
              <Pressable onPress={() => setShowPresets((v) => !v)}>
                <Text style={{ color: colors.accent, fontFamily: fonts.bold }}>
                  {showPresets ? 'Hide suggestions' : '+ Add from suggestions'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setEnvelopes((list) => [...list, draftEnvelope('')])}>
                <Text style={{ color: colors.accent, fontFamily: fonts.bold }}>+ Custom</Text>
              </Pressable>
            </View>
            {showPresets && (
              <PresetPicker
                taken={envelopes.map((e) => e.name)}
                onPick={(name) => setEnvelopes((list) => [...list, draftEnvelope(name)])}
              />
            )}

            <Card style={{ marginTop: spacing.md, backgroundColor: leftover < 0 ? colors.dangerSoft : colors.accentSoft }}>
              <View style={styles.row}>
                <Text style={styles.title}>{SAVINGS_NAME}</Text>
                <Text style={[styles.title, leftover < 0 && { color: colors.danger }]}>{formatMoney(leftover)}</Text>
              </View>
              <Text style={[styles.muted, { marginTop: spacing.xs }]}>
                {leftover < 0
                  ? `Your limits are ${formatMoney(-leftover)} more than your income, so this would start each month below zero.`
                  : 'What your income leaves after the limits above. If another envelope runs out, the difference comes out of this one.'}
              </Text>
            </Card>

            <View style={{ marginTop: spacing.md }}>
              <Button title="Start budgeting" onPress={finish} disabled={named.length < 1} />
              <Button title="Back" variant="secondary" onPress={() => setStep('income')} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
