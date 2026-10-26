import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { billStatus, type BillStatus } from '@/lib/budget';
import { shortDateLabel, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import type { Bill, DateString } from '@/lib/types';
import { colors, fonts, radius, spacing } from './theme';
import { Card, styles } from './ui';

const STATUS: Record<BillStatus, { label: string; color: string }> = {
  paid: { label: 'Paid', color: colors.accent },
  overdue: { label: 'Overdue, not marked paid', color: colors.danger },
  'due-today': { label: 'Due today', color: colors.warning },
  upcoming: { label: 'Upcoming', color: colors.muted },
};

// One due date of a bill, with a button to mark it paid.
export function BillCard({ bill, date, detail, onPress }: { bill: Bill; date: DateString; detail?: string; onPress: () => void }) {
  const paidBills = useBudget((s) => s.paidBills);
  const togglePaid = useBudget((s) => s.togglePaid);
  const status = billStatus(bill.id, date, new Set(paidBills), today());
  const paid = status === 'paid';

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={status === 'overdue' ? { borderColor: colors.danger, borderWidth: 1 } : undefined}>
        <View style={styles.row}>
          <Text style={[styles.title, paid && { color: colors.muted }]}>{bill.name}</Text>
          <Text style={[styles.money, { fontSize: 17 }, paid && { color: colors.muted }]}>{formatMoney(bill.amount)}</Text>
        </View>
        <Text style={styles.muted}>
          {shortDateLabel(date)}
          {detail ? ` · ${detail}` : ''}
        </Text>
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <Text style={[styles.muted, { color: STATUS[status].color, fontFamily: fonts.bold }]}>{STATUS[status].label}</Text>
          <Pressable
            onPress={() => togglePaid(bill.id, date)}
            accessibilityRole="button"
            accessibilityLabel={paid ? `Mark ${bill.name} unpaid` : `Mark ${bill.name} paid`}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.sm,
              backgroundColor: paid ? colors.background : colors.accentSoft,
            }}
          >
            <Ionicons name={paid ? 'arrow-undo-outline' : 'checkmark'} size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontFamily: fonts.bold }}>{paid ? 'Undo' : 'Mark paid'}</Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}
