import { dateInMonth, daysInMonth, monthOf, monthsBetween, weekdayOf } from './dates';
import { estimateMonthlyFromHourly } from './money';
import type { Bill, BudgetData, DateString, Envelope, Income, IncomeChange, Month } from './types';

export function monthlyIncome(income: Income): number {
  return income.mode === 'salary'
    ? income.monthly
    : estimateMonthlyFromHourly(income.hourlyRate, income.hoursPerWeek);
}

// Picks the change in effect for a month: the latest one at or before it,
// or the earliest one when the month comes before all of them.
function inEffect<T extends { fromMonth: Month }>(changes: T[], month: Month): T | undefined {
  let found: T | undefined;
  for (const change of changes) {
    if (change.fromMonth <= month && (!found || change.fromMonth >= found.fromMonth)) found = change;
  }
  return found;
}

export function limitFor(envelope: Envelope, month: Month): number {
  return inEffect(envelope.limits, month)?.amount ?? 0;
}

export function incomeFor(incomes: IncomeChange[], month: Month): Income {
  const sorted = [...incomes].sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));
  return (inEffect(sorted, month) ?? sorted[0])?.income ?? { mode: 'salary', monthly: 0 };
}

export function isActive(envelope: Envelope, month: Month): boolean {
  return (
    envelope.createdMonth <= month &&
    (envelope.archivedMonth === undefined || month < envelope.archivedMonth)
  );
}

export function billDueDates(bill: Bill, month: Month): DateString[] {
  if (month < monthOf(bill.startDate)) return [];
  const startDay = Number(bill.startDate.slice(8, 10));
  let dates: DateString[];
  switch (bill.frequency) {
    case 'monthly':
      dates = [dateInMonth(month, startDay)];
      break;
    case 'yearly':
      dates = month.slice(5, 7) === bill.startDate.slice(5, 7) ? [dateInMonth(month, startDay)] : [];
      break;
    case 'weekly': {
      const weekday = weekdayOf(bill.startDate);
      dates = [];
      for (let d = 1; d <= daysInMonth(month); d++) {
        const date = dateInMonth(month, d);
        if (weekdayOf(date) === weekday) dates.push(date);
      }
      break;
    }
  }
  return dates.filter((d) => d >= bill.startDate && (bill.endDate === undefined || d < bill.endDate));
}

export interface BillOccurrence {
  bill: Bill;
  date: DateString;
}

export function billsInMonth(bills: Bill[], month: Month): BillOccurrence[] {
  return bills
    .flatMap((bill) => billDueDates(bill, month).map((date) => ({ bill, date })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface EnvelopeMonth {
  envelope: Envelope;
  limit: number;
  rollover: number;
  spent: number;
  billsSetAside: number;
  transfersIn: number;
  transfersOut: number;
  // Shortfall pulled in from Savings/Discretionary to bring this envelope back to zero.
  coveredBySavings: number;
  // What's left to spend. Only the savings envelope can be below zero.
  available: number;
}

export interface MonthSummary {
  month: Month;
  envelopes: EnvelopeMonth[];
  income: number;
  // How far the other envelopes' limits go past income. When above zero,
  // Savings / Discretionary starts the month below zero by this much.
  overAssigned: number;
  // Total pulled out of Savings/Discretionary to cover other envelopes.
  totalCovered: number;
}

// Walks every month from the budget's start so leftover (or negative savings)
// rolls into the next month, then returns the requested month.
export function summarizeMonth(data: BudgetData, month: Month): MonthSummary {
  const all = summarizeMonths(data, month);
  return all[all.length - 1];
}

// Every month from the budget's start through `end`, oldest first.
export function summarizeMonths(data: BudgetData, end: Month): MonthSummary[] {
  let carry = new Map<string, number>();
  const out: MonthSummary[] = [];
  const start = data.startMonth <= end ? data.startMonth : end;
  for (const m of monthsBetween(start, end)) {
    const result = summarizeOne(data, m, carry);
    carry = new Map(result.envelopes.map((e) => [e.envelope.id, e.available]));
    out.push(result);
  }
  return out;
}

function summarizeOne(data: BudgetData, month: Month, carry: Map<string, number>): MonthSummary {
  const active = data.envelopes.filter((e) => isActive(e, month));
  const bills = billsInMonth(data.bills, month);
  const income = monthlyIncome(incomeFor(data.incomes, month));
  const otherLimits = active.filter((e) => !e.isSavings).reduce((t, e) => t + limitFor(e, month), 0);

  const rows: EnvelopeMonth[] = active.map((envelope) => {
    const id = envelope.id;
    // Savings / Discretionary gets whatever income the other envelopes don't.
    const limit = envelope.isSavings ? income - otherLimits : limitFor(envelope, month);
    const rollover = carry.get(id) ?? 0;
    const spent = sum(data.expenses.filter((x) => x.envelopeId === id && monthOf(x.date) === month));
    const billsSetAside = sum(bills.filter((b) => b.bill.envelopeId === id).map((b) => b.bill));
    const monthTransfers = data.transfers.filter((t) => t.month === month);
    const transfersIn = sum(monthTransfers.filter((t) => t.toEnvelopeId === id));
    const transfersOut = sum(monthTransfers.filter((t) => t.fromEnvelopeId === id));
    return {
      envelope,
      limit,
      rollover,
      spent,
      billsSetAside,
      transfersIn,
      transfersOut,
      coveredBySavings: 0,
      available: limit + rollover - spent - billsSetAside + transfersIn - transfersOut,
    };
  });

  const savings = rows.find((r) => r.envelope.isSavings);
  let totalCovered = 0;
  if (savings) {
    for (const row of rows) {
      if (row === savings || row.available >= 0) continue;
      const shortfall = -row.available;
      row.coveredBySavings = shortfall;
      row.available = 0;
      savings.available -= shortfall;
      totalCovered += shortfall;
    }
  }

  return {
    month,
    envelopes: rows,
    income,
    overAssigned: Math.max(0, otherLimits - income),
    totalCovered,
  };
}

function sum(items: { amount: number }[]): number {
  return items.reduce((t, i) => t + i.amount, 0);
}

export type BillStatus = 'paid' | 'overdue' | 'due-today' | 'upcoming';

// Identifies one due date of a bill, for marking it paid.
export function billKey(billId: string, date: DateString): string {
  return `${billId}:${date}`;
}

export function billStatus(billId: string, date: DateString, paid: ReadonlySet<string>, todayDate: DateString): BillStatus {
  if (paid.has(billKey(billId, date))) return 'paid';
  if (date < todayDate) return 'overdue';
  return date === todayDate ? 'due-today' : 'upcoming';
}
