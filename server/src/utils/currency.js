// utils/currency.js
// Prices are stored in a smaller base unit and converted to/from Naira for
// display and input using this rate. Single source of truth — update here,
// not in each call site. (Previously duplicated as a hardcoded 1500 across
// adminController.js, advanced-ai.js, ai.js, cart.js, and zoho.js.)
const NAIRA_PER_UNIT = 1500;

module.exports = { NAIRA_PER_UNIT };
