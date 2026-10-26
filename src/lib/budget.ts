import { dateInMonth, daysInMonth, monthOf, monthsBetween, weekdayOf } from './dates';
import { estimateMonthlyFromHourly } from './money';
import type { Bill, BudgetData, DateString, Envelope, Income, Month } from './types';

export function monthlyIncome(income: Income): number {
  return income.mode === 'salary'
    ? income.monthly
    : estimateMonthlyFromHourly(income.hourlyRate, income.hoursPerWeek);
}

export function limitFor(envelope: Envelope, month: Month): number {
  let amount = 0;
  let from = '';
  for (const change of envelope.limits) {
    if (change.fromMonth <= month && change.fromMonth >= from) {
      amount = change.amount;
      from = change.fromMonth;
    }
  }
  return amount;
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
  unassigned: number;
  // Total pulled out of Savings/Discretionary to cover other envelopes.
  totalCovered: number;
}

// Walks every month from the budget's start so leftover (or negative savings)
// rolls into the next month, then returns the requested month.
export function summarizeMonth(data: BudgetData, month: Month): MonthSummary {
  let carry = new Map<string, number>();
  let result: MonthSummary | null = null;

  const start = data.startMonth <= month ? data.startMonth : month;
  for (const m of monthsBetween(start, month)) {
    result = summarizeOne(data, m, carry);
    carry = new Map(result.envelopes.map((e) => [e.envelope.id, e.available]));
  }
  return result!;
}

function summarizeOne(data: BudgetData, month: Month, carry: Map<string, number>): MonthSummary {
  const active = data.envelopes.filter((e) => isActive(e, month));
  const bills = billsInMonth(data.bills, month);

  const rows: EnvelopeMonth[] = active.map((envelope) => {
    const id = envelope.id;
    const limit = limitFor(envelope, month);
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

  const income = monthlyIncome(data.income);
  return {
    month,
    envelopes: rows,
    income,
    unassigned: income - rows.reduce((t, r) => t + r.limit, 0),
    totalCovered,
  };
}

function sum(items: { amount: number }[]): number {
  return items.reduce((t, i) => t + i.amount, 0);
}
