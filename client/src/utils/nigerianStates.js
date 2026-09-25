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

export const NIGERIA_POSTAL_CODES = {
  "abia": { default: "440001", "umuahia": "440221", "aba": "450211", "ohafia": "442101", "arochukwu": "442103", "osisioma": "450101", "ugwunagbo": "450102", "ukwa": "452101" },
  "lagos": { default: "100001", "ikeja": "100271", "lekki": "105101", "ibeju-lekki": "105101", "victoria island": "101241", "ikoyi": "101233", "surulere": "101283", "yaba": "101212", "alimosho": "100275", "ajah": "105102", "festac": "102312", "badagry": "103101", "ikorodu": "104101", "epe": "106101", "maryland": "100211", "ogba": "100218" },
  "abuja": { default: "900001", "garki": "900241", "wuse": "900288", "maitama": "900271", "asokoro": "900231", "gwarinpa": "900108", "kubwa": "901101", "lugbe": "900107", "central area": "900211" },
  "fct": { default: "900001", "abuja": "900001", "garki": "900241", "wuse": "900288" },
  "rivers": { default: "500001", "port harcourt": "500272", "port-harcourt": "500272", "obio-akpor": "500102", "eleme": "501101", "diobu": "500261" },
  "enugu": { default: "400001", "enugu north": "400211", "nsukka": "410001", "independence layout": "400102", "ogui": "400104" },
  "imo": { default: "460001", "owerri": "460281", "orlu": "473211", "okigwe": "470211" },
  "anambra": { default: "420001", "awka": "420211", "onitsha": "430211", "nnewi": "435101" },
  "kano": { default: "700001", "kano municipal": "700211", "fagge": "700221", "nasarawa": "700213" },
  "oyo": { default: "200001", "ibadan": "200284", "ogbomosho": "210211", "oyo": "211211", "bodija": "200211" },
  "ogun": { default: "110001", "abeokuta": "110242", "ota": "112233", "sagamu": "121211", "ijebu ode": "120211", "mowe": "110115", "ibafo": "110113" },
  "delta": { default: "320001", "asaba": "320241", "warri": "332211", "ughelli": "333211", "sapele": "336211" },
  "edo": { default: "300001", "benin city": "300251", "ekpoma": "310101", "auchi": "312101" },
  "akwa ibom": { default: "520001", "uyo": "520211", "eket": "524101", "ikot ekpene": "530101" },
  "cross river": { default: "540001", "calabar": "540222", "ikot ansa": "540281", "ikom": "550101" },
  "ebonyi": { default: "480001", "abakaliki": "480211", "afikpo": "490101" },
  "kaduna": { default: "800001", "kaduna north": "800283", "zaria": "810211", "kafanchan": "801101" },
  "plateau": { default: "930001", "jos": "930262", "bukuru": "930105" },
  "kwara": { default: "240001", "ilorin": "240212", "offa": "250101" },
  "ondo": { default: "340001", "akure": "340283", "ondo town": "351101" },
  "osun": { default: "230001", "osogbo": "230284", "ife": "220282", "ilesa": "233211" },
  "ekiti": { default: "360001", "ado ekiti": "360211", "ikere": "361101" },
  "benue": { default: "970001", "makurdi": "970211", "gboko": "981101", "otukpo": "972101" },
  "kogi": { default: "260001", "lokoja": "260211", "okene": "264101" },
  "bayelsa": { default: "569001", "yenagoa": "569211" },
  "nasarawa": { default: "950001", "lafia": "950211", "karu": "961101", "keffi": "961101" },
  "niger": { default: "920001", "minna": "920211", "suleja": "910101", "bida": "912101" },
  "adamawa": { default: "640001", "yola": "640211", "mubi": "650101" },
  "bauchi": { default: "740001", "bauchi": "740211", "azare": "751101" },
  "borno": { default: "600001", "maiduguri": "600282" },
  "gombe": { default: "760001", "gombe": "760221" },
  "taraba": { default: "660001", "jalingo": "660213", "wukari": "670101" },
  "yobe": { default: "620001", "damaturu": "620211", "potiskum": "622101" },
  "jigawa": { default: "720001", "dutse": "720211", "hadejia": "731101" },
  "katsina": { default: "820001", "katsina": "820211", "daura": "824101" },
  "kebbi": { default: "860001", "birnin kebbi": "860211" },
  "sokoto": { default: "840001", "sokoto": "840212" },
  "zamfara": { default: "860001", "gusau": "860241" }
};

export function resolveNigerianPostalCode(stateName, cityName, postcodeHint = "", addressText = "") {
  if (postcodeHint && String(postcodeHint).trim().length >= 4 && !isNaN(Number(String(postcodeHint).trim()))) {
    return String(postcodeHint).trim();
  }
  if (addressText) {
    const match6 = String(addressText).match(/\b(\d{6})\b/);
    if (match6) return match6[1];
    const match5 = String(addressText).match(/\b(\d{5})\b/);
    if (match5) return match5[1];
  }
  const sClean = String(stateName || "").toLowerCase().replace(/state/gi, "").trim();
  const cClean = String(cityName || "").toLowerCase().trim();
  const stateDict = NIGERIA_POSTAL_CODES[sClean] || NIGERIA_POSTAL_CODES["abia"];
  if (stateDict) {
    for (const [k, code] of Object.entries(stateDict)) {
      if (k !== "default" && (cClean.includes(k) || String(addressText || "").toLowerCase().includes(k))) {
        return code;
      }
    }
    return stateDict.default || "440001";
  }
  return "440001";
}
