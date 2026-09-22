// client/src/utils/nigerianStates.js

export const NIGERIAN_STATES = [
  "Abia",
  "Abuja (FCT)",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export function normalizeNigerianState(input) {
  if (!input) return "Abia";
  const raw = String(input).trim();
  const clean = raw.toLowerCase().replace(/state/gi, "").trim();

  if (
    clean.includes("abuja") ||
    clean.includes("fct") ||
    clean.includes("federal capital")
  ) {
    return "Abuja (FCT)";
  }

  // Exact match without 'state'
  const exact = NIGERIAN_STATES.find(
    (s) => s.toLowerCase() === clean || s.toLowerCase() === raw.toLowerCase()
  );
  if (exact) return exact;

  // Substring match
  const partial = NIGERIAN_STATES.find(
    (s) =>
      clean.includes(s.toLowerCase()) || s.toLowerCase().includes(clean)
  );
  if (partial) return partial;

  return "Abia";
}
