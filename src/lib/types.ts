// All money values are integer cents. All months are "YYYY-MM" strings,
// and all dates are "YYYY-MM-DD" strings in the phone's local time.

export type Month = string;
export type DateString = string;

export interface LimitChange {
  fromMonth: Month;
  amount: number;
}

export interface Envelope {
  id: string;
  name: string;
  // The limit in effect for a month is the latest change at or before it,
  // so editing a limit never rewrites past months.
  limits: LimitChange[];
  // The one envelope that covers every other envelope's shortfall.
  isSavings: boolean;
  createdMonth: Month;
  archivedMonth?: Month;
}

export interface Expense {
  id: string;
  envelopeId: string;
  amount: number;
  date: DateString;
  note?: string;
}

export type BillFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  envelopeId: string;
  accountId?: string;
  frequency: BillFrequency;
  // First due date. Later due dates repeat from it.
  startDate: DateString;
  // Set when the bill is deleted. Due dates from here on are dropped,
  // while past months keep it so their balances don't change.
  endDate?: DateString;
}

export interface Transfer {
  id: string;
  fromEnvelopeId: string;
  toEnvelopeId: string;
  amount: number;
  month: Month;
}

export interface Account {
  id: string;
  name: string;
}

export type Income =
  | { mode: 'salary'; monthly: number }
  | { mode: 'hourly'; hourlyRate: number; hoursPerWeek: number };

export interface BudgetData {
  income: Income;
  envelopes: Envelope[];
  expenses: Expense[];
  bills: Bill[];
  transfers: Transfer[];
  accounts: Account[];
  // First month the budget exists. Rollover is computed from here.
  startMonth: Month;
}
