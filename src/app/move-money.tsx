import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { spacing, useScheme } from '@/components/theme';
import { Button, Chips, Field, SectionTitle, styles } from '@/components/ui';
import { currentMonth } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney, parseMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

export default function MoveMoney() {
  useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ toEnvelopeId?: string }>();
  const summary = useMonthSummary(currentMonth());
  const moveMoney = useBudget((s) => s.moveMoney);
  const options = summary.envelopes.map((e) => ({
    value: e.envelope.id,
    label: `${e.envelope.name} (${formatMoney(e.available, { showCents: false })})`,
  }));

  const [toId, setToId] = useState(params.toEnvelopeId);
  const [fromId, setFromId] = useState(summary.envelopes.find((e) => e.envelope.isSavings && e.envelope.id !== toId)?.envelope.id);
  const [amount, setAmount] = useState('');

  function save() {
    const cents = parseMoney(amount);
    if (!fromId || !toId || fromId === toId || !cents) {
      Alert.alert('Pick two different categories and an amount.');
      return;
    }
    moveMoney({ fromEnvelopeId: fromId, toEnvelopeId: toId, amount: cents });
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>Moves money for this month only, like taking cash from one category and putting it in another.</Text>
      <SectionTitle>From</SectionTitle>
      <Chips options={options} value={fromId} onChange={setFromId} />
      <SectionTitle>To</SectionTitle>
      <Chips options={options} value={toId} onChange={setToId} />
      <Field label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <Button title="Move money" onPress={save} />
    </ScrollView>
  );
}
