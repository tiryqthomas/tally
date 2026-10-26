import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { PresetPicker } from '@/components/PresetPicker';
import { spacing } from '@/components/theme';
import { Button, Field, SectionTitle, styles } from '@/components/ui';
import { isActive } from '@/lib/budget';
import { currentMonth } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney, parseMoney } from '@/lib/money';
import { SAVINGS_NAME, useBudget } from '@/lib/store';

export default function NewEnvelope() {
  const router = useRouter();
  const addEnvelope = useBudget((s) => s.addEnvelope);
  const taken = useBudget((s) => s.envelopes)
    .filter((e) => isActive(e, currentMonth()))
    .map((e) => e.name);
  const savings = useMonthSummary(currentMonth()).envelopes.find((e) => e.envelope.isSavings);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const cents = parseMoney(limit);

  function save() {
    if (!name.trim() || cents === null) {
      Alert.alert('Add a name and a monthly limit.');
      return;
    }
    addEnvelope(name.trim(), cents);
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Eating out" />
      <Field label="Monthly limit ($)" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="0.00" />
      {savings && (
        <Text style={[styles.muted, { marginBottom: spacing.md }]}>
          This limit comes out of {SAVINGS_NAME}, which would get {formatMoney(savings.limit - (cents ?? 0))} a month
          instead of {formatMoney(savings.limit)}.
        </Text>
      )}
      <Button title="Create category" onPress={save} />

      <SectionTitle>Suggestions</SectionTitle>
      <PresetPicker taken={[...taken, name]} onPick={setName} />
    </ScrollView>
  );
}
