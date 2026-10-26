// Common envelopes offered during setup and when adding an envelope.
export const ENVELOPE_PRESETS: { group: string; names: string[] }[] = [
  {
    group: 'Home',
    names: ['Rent / Mortgage', 'Utilities', 'Internet', 'Phone', 'Renters / Home insurance', 'Household supplies'],
  },
  {
    group: 'Getting around',
    names: ['Gas', 'Car payment', 'Car insurance', 'Car maintenance', 'Public transit', 'Rideshare / Parking'],
  },
  {
    group: 'Food',
    names: ['Groceries', 'Eating out', 'Coffee'],
  },
  {
    group: 'Health',
    names: ['Health insurance', 'Medical / Pharmacy', 'Gym / Fitness'],
  },
  {
    group: 'Money',
    names: ['Credit card payment', 'Student loans', 'Emergency fund', 'Investing'],
  },
  {
    group: 'Lifestyle',
    names: ['Subscriptions', 'Entertainment', 'Shopping / Clothing', 'Personal care', 'Hobbies', 'Travel', 'Gifts', 'Giving'],
  },
  {
    group: 'Family',
    names: ['Childcare', 'Kids', 'Pets', 'Education'],
  },
];

export const STARTER_ENVELOPES = ['Rent / Mortgage', 'Groceries', 'Gas', 'Utilities', 'Phone', 'Eating out'];
