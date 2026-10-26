import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { draftFromIncome, IncomeForm, incomeFromDraft } from '@/components/IncomeForm';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Field, SectionTitle, styles } from '@/components/ui';
import { useBudget } from '@/lib/store';

export default function SettingsScreen() {
  const income = useBudget((s) => s.income);
  const accounts = useBudget((s) => s.accounts);
  const { setIncome, addAccount, deleteAccount, resetAll } = useBudget.getState();

  const [draft, setDraft] = useState(() => draftFromIncome(income));
  const [accountName, setAccountName] = useState('');
  const parsed = incomeFromDraft(draft);

  function saveIncome() {
    if (!parsed) return;
    setIncome(parsed);
    Alert.alert('Income updated');
  }

  function confirmReset() {
    Alert.alert('Erase everything?', 'All envelopes, spending and bills on this phone will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: resetAll },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionTitle>Monthly income</SectionTitle>
      <IncomeForm draft={draft} onChange={setDraft} />
      <Button title="Save income" onPress={saveIncome} disabled={!parsed} />

      <SectionTitle>Accounts bills come out of</SectionTitle>
      {accounts.map((a) => (
        <Card key={a.id}>
          <View style={styles.row}>
            <Text style={styles.body}>{a.name}</Text>
            <Pressable onPress={() => deleteAccount(a.id)} hitSlop={8}>
              <Text style={{ color: colors.danger }}>Remove</Text>
            </Pressable>
          </View>
        </Card>
      ))}
      <Field label="Add an account" value={accountName} onChangeText={setAccountName} placeholder="e.g. Chase checking" />
      <Button
        title="Add account"
        variant="secondary"
        disabled={!accountName.trim()}
        onPress={() => {
          addAccount(accountName.trim());
          setAccountName('');
        }}
      />

      <SectionTitle>Your data</SectionTitle>
      <Text style={[styles.muted, { marginBottom: spacing.md }]}>
        Tally has no accounts or cloud sync. Everything is stored only on this phone, so deleting the app deletes your
        budget.
      </Text>
      <Button title="Erase all data" variant="danger" onPress={confirmReset} />
    </ScrollView>
  );
}
