import { describe, expect, test } from "@jest/globals";

import { limitHistory, scaleTop, snapLimit } from "./limits";
import type { BudgetData } from "./types";

const data = (): BudgetData => ({
  incomes: [
    { fromMonth: "2026-06", income: { mode: "salary", monthly: 300000 } },
  ],
  envelopes: [
    {
      id: "food",
      name: "Groceries",
      limits: [{ fromMonth: "2026-06", amount: 60000 }],
      isSavings: false,
      createdMonth: "2026-06",
    },
    {
      id: "new",
      name: "Pets",
      limits: [{ fromMonth: "2026-10", amount: 5000 }],
      isSavings: false,
      createdMonth: "2026-10",
    },
    {
      id: "s",
      name: "Savings",
      limits: [],
      isSavings: true,
      createdMonth: "2026-06",
    },
  ],
  expenses: [
    { id: "1", envelopeId: "food", amount: 99999, date: "2026-06-10" },
    { id: "2", envelopeId: "food", amount: 40000, date: "2026-07-10" },
    { id: "3", envelopeId: "food", amount: 50000, date: "2026-08-03" },
    { id: "4", envelopeId: "food", amount: 30000, date: "2026-09-20" },
    { id: "5", envelopeId: "food", amount: 7000, date: "2026-10-02" },
  ],
  bills: [
    {
      id: "b",
      name: "Box",
      amount: 6000,
      envelopeId: "food",
      frequency: "monthly",
      startDate: "2026-09-05",
    },
  ],
  transfers: [],
  accounts: [],
  startMonth: "2026-06",
});

describe("limit history", () => {
  test("averages the last three full months, bills included, and keeps this month apart", () => {
    const h = limitHistory(data(), "food", "2026-10");
    expect(h.past.map((u) => u.month)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(h.past[2]).toEqual({ month: "2026-09", spent: 30000, bills: 6000 });
    expect(h.average).toBe(42000);
    expect(h.current).toEqual({ month: "2026-10", spent: 7000, bills: 6000 });
  });

  test("a category made this month has no past months", () => {
    const h = limitHistory(data(), "new", "2026-10");
    expect(h.past).toEqual([]);
    expect(h.average).toBe(0);
  });

  test("snaps to five dollars and never goes negative", () => {
    expect(snapLimit(41234)).toBe(41000);
    expect(snapLimit(41260)).toBe(41500);
    expect(snapLimit(-800)).toBe(0);
  });

  test("scale top leaves headroom and rounds", () => {
    expect(scaleTop(42000, 60000)).toBe(90000);
    expect(scaleTop(0)).toBe(15000);
  });
});
