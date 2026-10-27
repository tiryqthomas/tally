import { Pressable, Text, View } from 'react-native';

import { billStatus, type BillStatus } from '@/lib/budget';
import { shortDateLabel, today } from '@/lib/dates';
import { useBudget } from '@/lib/store';
import type { Bill, DateString } from '@/lib/types';
import { digits, tape } from './machine';
import { colors, fonts } from './theme';

const STATUS: Record<BillStatus, { label: string; color: string }> = {
  paid: { label: 'Paid', color: colors.accent },
  overdue: { label: 'Not marked paid', color: colors.danger },
  'due-today': { label: 'Due today', color: colors.warning },
  upcoming: { label: 'Upcoming', color: colors.muted },
};

// One due date of a bill, as a row on a sheet like every other list: name and amount, then the
// date and status, with a text action to mark it paid. `first` drops the rule above the top row.
export function BillRow({
  bill,
  date,
  detail,
  first,
  onPress,
}: {
  bill: Bill;
  date: DateString;
  detail?: string;
  first?: boolean;
  onPress: () => void;
}) {
  const paidBills = useBudget((s) => s.paidBills);
  const togglePaid = useBudget((s) => s.togglePaid);
  const status = billStatus(bill.id, date, new Set(paidBills), today());
  const paid = status === 'paid';
  const dim = paid ? { color: colors.muted } : undefined;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[tape.row, !first && tape.divider]}>
      <View style={tape.line}>
        <Text style={[tape.name, dim, { flex: 1 }]} numberOfLines={1}>
          {bill.name}
        </Text>
        <Text style={[tape.amount, dim]}>{digits(bill.amount)}</Text>
      </View>
      <View style={tape.line}>
        <Text style={[tape.caption, { flex: 1 }]} numberOfLines={1}>
          {shortDateLabel(date)}
          {detail ? ` · ${detail}` : ''} · <Text style={{ color: STATUS[status].color }}>{STATUS[status].label}</Text>
        </Text>
        <Pressable
          onPress={() => togglePaid(bill.id, date)}
          accessibilityRole="button"
          accessibilityLabel={paid ? `Mark ${bill.name} unpaid` : `Mark ${bill.name} paid`}
          hitSlop={12}
        >
          <Text style={[tape.caption, { color: colors.accent, fontFamily: fonts.bold }]}>{paid ? 'Undo' : 'Mark paid'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
