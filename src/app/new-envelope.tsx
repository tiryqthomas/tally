import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { spacing } from '@/components/theme';
import { Button, Field, styles } from '@/components/ui';
import { currentMonth } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney, parseMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

export default function NewEnvelope() {
  const router = useRouter();
  const addEnvelope = useBudget((s) => s.addEnvelope);
  const { unassigned } = useMonthSummary(currentMonth());
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');

  function save() {
    const cents = parseMoney(limit);
    if (!name.trim() || cents === null) {
      Alert.alert('Add a name and a monthly limit.');
      return;
    }
    addEnvelope(name.trim(), cents);
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Eating out" autoFocus />
      <Field label="Monthly limit ($)" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="0.00" />
      {unassigned > 0 && (
        <Text style={[styles.muted, { marginBottom: spacing.md }]}>{formatMoney(unassigned)} of income is still unassigned.</Text>
      )}
      <Button title="Create envelope" onPress={save} />
    </ScrollView>
  );
}
