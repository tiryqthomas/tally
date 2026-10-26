import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { draftFromIncome, IncomeForm, incomeFromDraft } from '@/components/IncomeForm';
import { colors, machine, spacing } from '@/components/theme';
import { Button, Card, Chips, Field, SectionTitle, styles } from '@/components/ui';
import { incomeFor } from '@/lib/budget';
import { currentMonth } from '@/lib/dates';
import { exportBackup, pickBackup } from '@/lib/backupFile';
import { keyClick, logged } from '@/lib/feedback';
import { REMINDER_OPTIONS } from '@/lib/reminderPlan';
import { reminderPermission, sendTestReminder, type ReminderPermission } from '@/lib/reminders';
import { selectSaved, useBudget } from '@/lib/store';

export default function SettingsScreen() {
  const income = incomeFor(useBudget((s) => s.incomes), currentMonth());
  const accounts = useBudget((s) => s.accounts);
  const reminders = useBudget((s) => s.reminders);
  const sounds = useBudget((s) => s.sounds);
  const haptics = useBudget((s) => s.haptics);
  const { setIncome, addAccount, deleteAccount, resetAll, setReminders, setSounds, setHaptics, restore } = useBudget.getState();
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  useEffect(() => {
    reminderPermission().then(setPermission);
  }, [reminders]);

  const [draft, setDraft] = useState(() => draftFromIncome(income));
  const [accountName, setAccountName] = useState('');
  const parsed = incomeFromDraft(draft);

  function saveIncome() {
    if (!parsed) return;
    setIncome(parsed);
    Alert.alert('Income updated', 'The new amount applies from this month on. Past months keep the old amount.');
  }

  async function testReminder() {
    const sent = await sendTestReminder();
    setPermission(await reminderPermission());
    Alert.alert(
      sent ? 'Test reminder on its way' : 'Notifications are off',
      sent
        ? 'It should appear in about 5 seconds.'
        : 'Turn on notifications for this app in your phone settings, then try again.',
    );
  }

  async function backup() {
    try {
      await exportBackup(selectSaved(useBudget.getState()));
    } catch (e) {
      Alert.alert('Backup failed', String(e instanceof Error ? e.message : e));
    }
  }

  async function restoreFromFile() {
    let picked;
    try {
      picked = await pickBackup();
    } catch (e) {
      Alert.alert('Could not open the file', String(e instanceof Error ? e.message : e));
      return;
    }
    if (!picked) return;
    if (!picked.ok) {
      Alert.alert('Could not restore', picked.error);
      return;
    }
    const { state, exportedAt } = picked;
    const when = exportedAt ? ` from ${exportedAt.slice(0, 10)}` : '';
    Alert.alert('Replace everything?', `Everything on this phone will be replaced with the backup${when}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: () => {
          restore(state);
          setDraft(draftFromIncome(incomeFor(state.incomes, currentMonth())));
        },
      },
    ]);
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

      <SectionTitle>Bill reminders</SectionTitle>
      <Chips options={REMINDER_OPTIONS} value={reminders} onChange={setReminders} />
      <Text style={[styles.muted, { marginBottom: spacing.md }]}>
        {reminders === 'off'
          ? 'No reminders.'
          : permission === 'denied'
            ? 'Notifications are turned off for Tally. Turn them on in your phone settings to get reminders.'
            : permission === 'unsupported'
              ? 'Reminders work in the phone app.'
              : 'A notification at 9am for each bill you haven\'t marked paid.'}
      </Text>

      {reminders !== 'off' && permission !== 'unsupported' && (
        <Button title="Send a test reminder" variant="secondary" onPress={testReminder} />
      )}

      <SectionTitle>Sounds and vibration</SectionTitle>
      <Card>
        <Toggle
          label="Calculator sounds"
          detail="Key clicks while you type an amount, and the printer when you log spending."
          value={sounds}
          onChange={(on) => {
            setSounds(on);
            if (on) keyClick();
          }}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
        <Toggle
          label="Vibration"
          detail="A bump when you log spending."
          value={haptics}
          onChange={(on) => {
            setHaptics(on);
            if (on && !sounds) logged();
          }}
        />
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Text style={[styles.muted, { marginBottom: spacing.md }]}>
        Tally has no accounts or cloud sync. Everything is stored only on this phone, so deleting the app deletes your
        budget. Save a backup file now and then, for example to iCloud Drive or Google Drive, so you can restore it on
        a new phone.
      </Text>
      <Button title="Back up to a file" variant="secondary" onPress={backup} />
      <Button title="Restore from a backup" variant="secondary" onPress={restoreFromFile} />
      <Button title="Erase all data" variant="danger" onPress={confirmReset} />
    </ScrollView>
  );
}

function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <View style={[styles.row, { gap: spacing.md }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: machine.keyLight, true: machine.blue }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={machine.keyLight}
      />
    </View>
  );
}
