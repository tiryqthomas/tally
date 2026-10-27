import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { MonthCalendar } from '@/components/MonthCalendar';
import { colors, fonts, spacing, useScheme } from '@/components/theme';
import { Button, Field, SectionTitle, styles } from '@/components/ui';
import { addMonths, currentMonth, monthLabel, monthOf, today } from '@/lib/dates';
import { goalProgress } from '@/lib/goals';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney, parseMoney } from '@/lib/money';
import { SAVINGS_NAME, useBudget } from '@/lib/store';
import type { Goal } from '@/lib/types';

const toInput = (cents: number) => (cents / 100).toFixed(2);

// Add a goal, or edit one when an id is passed.
export default function GoalScreen() {
  useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const existing = useBudget((s) => s.goals.find((g) => g.id === params.id));
  const { addGoal, updateGoal, setGoalAllocation, toggleGoalBought, removeGoal } = useBudget.getState();
  const month = currentMonth();
  const savings = useMonthSummary(month).envelopes.find((e) => e.envelope.isSavings);
  const current = existing ? goalProgress(existing, month) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing ? toInput(existing.price) : '');
  const [date, setDate] = useState(existing?.targetDate ?? `${addMonths(month, 5)}-01`);
  const [calendarMonth, setCalendarMonth] = useState(monthOf(date));
  const [allocation, setAllocation] = useState(current ? toInput(current.allocation) : '');

  const priceCents = parseMoney(price);
  const allocationCents = parseMoney(allocation);
  // The plan as typed, so the suggestion follows the price and date.
  const draft: Goal = {
    id: existing?.id ?? 'draft',
    name,
    price: priceCents ?? 0,
    targetDate: date,
    allocations: existing?.allocations ?? [{ fromMonth: month, amount: 0 }],
    createdMonth: existing?.createdMonth ?? month,
    boughtMonth: existing?.boughtMonth,
  };
  const plan = goalProgress(draft, month);
  // This month's set-aside is already out of savings for an existing goal, so only the change counts.
  const savingsAfter = savings ? savings.available + (current?.allocation ?? 0) - (allocationCents ?? 0) : undefined;

  function save() {
    if (!name.trim() || !priceCents || allocationCents === null || (date < today() && date !== existing?.targetDate)) {
      Alert.alert('Add a name, a price, a monthly amount and a date from today on.');
      return;
    }
    if (existing) {
      updateGoal(existing.id, { name: name.trim(), price: priceCents, targetDate: date });
      if (allocationCents !== current?.allocation) setGoalAllocation(existing.id, allocationCents);
    } else {
      addGoal({ name: name.trim(), price: priceCents, targetDate: date, allocation: allocationCents });
    }
    router.back();
  }

  function remove() {
    if (!existing) return;
    const body = existing.boughtMonth
      ? 'It disappears from your goals.'
      : `The ${formatMoney(current?.saved ?? 0)} saved for it goes back into ${SAVINGS_NAME}.`;
    Alert.alert(`Remove ${existing.name}?`, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeGoal(existing.id);
          router.back();
        },
      },
    ]);
  }

  function toggleBought() {
    if (!existing) return;
    toggleGoalBought(existing.id);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit goal' : 'New goal' }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Field label="What do you want to buy?" value={name} onChangeText={setName} placeholder="e.g. New laptop, Trip to Japan" />
        <Field label="Price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />

        <SectionTitle>Buy by</SectionTitle>
        <MonthCalendar month={calendarMonth} onChangeMonth={setCalendarMonth} selected={date} onSelect={setDate} />

        <View style={{ height: spacing.md }} />
        <Field
          label="Put toward it each month ($)"
          value={allocation}
          onChangeText={setAllocation}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        {priceCents !== null && priceCents > 0 && !existing?.boughtMonth && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAllocation(toInput(plan.suggested))}
            style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}
          >
            <Text style={{ fontFamily: fonts.label, fontSize: 15, color: colors.accent, paddingVertical: spacing.sm }}>
              Use {formatMoney(plan.suggested)} a month to buy it by {monthLabel(monthOf(date))} ›
            </Text>
          </Pressable>
        )}
        {savingsAfter !== undefined && !existing?.boughtMonth && current?.status !== 'saved' && (
          <Text style={[styles.muted, { marginBottom: spacing.md }, savingsAfter < 0 && { color: colors.danger }]}>
            Comes out of {SAVINGS_NAME} on the 1st of each month
            {current && current.saved > 0 ? `, on top of the ${formatMoney(current.saved)} already saved` : ''}. This month it
            would have {formatMoney(savingsAfter)} left.
          </Text>
        )}

        <Button title={existing ? 'Save goal' : 'Add goal'} onPress={save} />
        {existing && (
          <Button
            title={existing.boughtMonth ? 'Not bought yet' : 'I bought it'}
            variant="secondary"
            onPress={toggleBought}
          />
        )}
        {existing && !existing.boughtMonth && (
          <Text style={[styles.muted, { marginBottom: spacing.md }]}>
            When you buy it, the money saved here pays for it, so there's no need to log it as spending. Log any difference
            in a category.
          </Text>
        )}
        {existing && <Button title="Remove goal" variant="danger" onPress={remove} />}
      </ScrollView>
    </>
  );
}
