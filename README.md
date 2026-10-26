# Tally

An envelope budgeting app that makes spending feel like handing over cash. Every dollar goes in an envelope, and every purchase is logged by hand.

Built with Expo (SDK 58), Expo Router, and Zustand. All data stays on the phone in a SQLite key-value store. There are no accounts and no cloud sync.

## Try it on your phone

1. Install [Node.js](https://nodejs.org) (version 20 or newer).
2. Install the **Expo Go** app on your phone from the App Store or Google Play.
3. In this folder, run:

   ```sh
   npm install
   npx expo start
   ```

4. Scan the QR code it prints. Use the Camera app on iPhone, or Expo Go on Android.

## How the budget works

The rules live in `src/lib/budget.ts` and are covered by tests (`npm test`).

- Each envelope's available balance = monthly limit + last month's leftover + money moved in − money moved out − bills set aside − spending.
- Savings / Discretionary gets whatever income the other envelopes' limits leave, and its balance carries month to month as a running savings total.
- Every bill due in a month is set aside from its envelope on the 1st.
- If any envelope goes below zero, the shortfall is pulled from Savings / Discretionary automatically. Only that envelope can go negative.
- Leftover money rolls into the same envelope next month, and so does a negative Savings / Discretionary balance.
- Income is one monthly number, and a change applies from the current month on. Hourly pay is estimated as rate × hours per week × 52 ÷ 12.
- The budget month always starts on the 1st.
- Each due date of a bill can be marked paid. Unpaid bills past their date show as overdue, and reminders (Settings → Bill reminders) go out at 9am for unpaid bills.
- Settings → Your data can save a backup file and restore it, since nothing is synced to the cloud.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/app/` | Screens. Every file is a route (Expo Router). |
| `src/app/(tabs)/` | The three tabs: Envelopes, Bills, Settings. |
| `src/lib/budget.ts` | Budget math (pure functions, tested). |
| `src/lib/store.ts` | App state, saved on the phone. |
| `src/components/` | Shared UI pieces, the calendar, and the theme. |

## Commands

```sh
npm test            # budget logic tests
npm run typecheck   # TypeScript
npx expo start      # dev server
```

## Before publishing

- `app.json` uses the placeholder bundle id `com.tally.budget`. Change it to one you own before building for the stores.
- The app icon and splash screen are still the Expo defaults.
