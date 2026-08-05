// utils/currency.js
// Prices are stored in a smaller base unit and converted to/from Naira for
// display and input using this rate. Single source of truth — update here,
// not in each call site. Mirrors server/src/utils/currency.js.
export const NAIRA_PER_UNIT = 1500;