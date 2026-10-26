// Formats integer cents as dollars, e.g. -123456 -> "-$1,234.56".
export function formatMoney(cents: number, opts: { showCents?: boolean } = {}): string {
  const showCents = opts.showCents ?? true;
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = String(abs % 100).padStart(2, '0');
  return showCents ? `${sign}$${dollars}.${rest}` : `${sign}$${dollars}`;
}

// Parses user input like "12", "12.5" or "$1,200.00" into cents.
// Returns null for anything that isn't a non-negative amount.
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
}

// Hourly pay estimated as a month: rate x hours/week x 52 weeks / 12 months.
export function estimateMonthlyFromHourly(hourlyRate: number, hoursPerWeek: number): number {
  return Math.round((hourlyRate * hoursPerWeek * 52) / 12);
}
