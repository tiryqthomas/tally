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
  // The one envelope that covers every other envelope's shortfall. Its monthly
  // amount is always income minus every other limit, so its `limits` are unused.
  isSavings: boolean;
  createdMonth: Month;
  archivedMonth?: Month;
  // The category's color on Home, in charts and on its own screen. Savings has none; it uses the accent.
  color?: CategoryColor;
}

// Eight muted category colors, none of them red: red only ever means "over".
export const CATEGORY_COLORS = ['slate', 'fern', 'clay', 'mustard', 'violet', 'lagoon', 'rose', 'olive'] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface Expense {
  id: string;
  envelopeId: string;
  amount: number;
  date: DateString;
  note?: string;
  // File name of a receipt photo kept in the app's own storage on the phone,
  // e.g. "lq3x9k2abc.jpg". Never a full path, since the app's folder can move on updates.
  receipt?: string;
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

export interface IncomeChange {
  fromMonth: Month;
  income: Income;
}

// Something to buy. Each month from its creation a set amount moves out of
// Savings / Discretionary into the goal, until it is fully saved.
export interface Goal {
  id: string;
  name: string;
  price: number;
  targetDate: DateString;
  // The monthly amount in effect is the latest change at or before a month,
  // like category limits.
  allocations: LimitChange[];
  createdMonth: Month;
  // Set when bought. The saved money paid for it, and set-asides stop after this month.
  boughtMonth?: Month;
  // Set when removed. Unless it was bought, everything saved goes back to
  // Savings / Discretionary in this month.
  removedMonth?: Month;
}

export interface BudgetData {
  // Income in effect for a month is the latest change at or before it,
  // so a raise never rewrites past months' savings.
  incomes: IncomeChange[];
  envelopes: Envelope[];
  expenses: Expense[];
  bills: Bill[];
  transfers: Transfer[];
  accounts: Account[];
  goals: Goal[];
  // First month the budget exists. Rollover is computed from here.
  startMonth: Month;
}
