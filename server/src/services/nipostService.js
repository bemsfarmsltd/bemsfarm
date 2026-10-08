// server/src/services/nipostService.js
// NIPOST Official Nigerian National Digital Postcode Integration

const https = require("https");

const NIPOST_BASE_URL = process.env.NIPOST_BASE_URL || "https://api.postcode.gov.ng";
const NIPOST_API_KEY = process.env.NIPOST_API_KEY || "";

// In-memory cache for reference catalogs (states & LGAs)
const memoryCache = {
  states: null,
  statesExpiresAt: 0,
  lgas: {}, // stateCode -> { data, expiresAt }
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Execute an authenticated HTTPS GET request to NIPOST Gateway
 */
function fetchNipost(path) {
  return new Promise((resolve) => {
    const apiKey = process.env.NIPOST_API_KEY || NIPOST_API_KEY;
    if (!apiKey) {
      return resolve({ success: false, error: "NIPOST_API_KEY not configured" });
    }

    const fullUrl = `${NIPOST_BASE_URL}${path}`;
    const urlObj = new URL(fullUrl);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Accept": "application/json",
        "User-Agent": "BemsFarms-Logistics/2.0",
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: json.data || json });
          } else {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: json.error?.message || `HTTP ${res.statusCode}`,
            });
          }
        } catch (e) {
          resolve({ success: false, error: "Invalid JSON response from NIPOST" });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, error: "NIPOST request timeout (5s)" });
    });

    req.end();
  });
}

/**
 * Fetch list of all 37 Nigerian states (cached for 24h)
 */
async function getStates() {
  const now = Date.now();
  if (memoryCache.states && memoryCache.statesExpiresAt > now) {
    return { success: true, states: memoryCache.states };
  }

  const res = await fetchNipost("/v1/reference/states");
  if (res.success && res.data?.states) {
    memoryCache.states = res.data.states;
    memoryCache.statesExpiresAt = now + CACHE_TTL_MS;
    return { success: true, states: res.data.states };
  }
  return res;
}

/**
 * Fetch list of LGAs for a given state code (e.g. 'AB', 'LA', 'FC') (cached for 24h)
 */
async function getLgasByState(stateCode) {
  if (!stateCode) return { success: false, error: "stateCode is required" };
  const sUpper = String(stateCode).trim().toUpperCase();
  const now = Date.now();

  if (memoryCache.lgas[sUpper] && memoryCache.lgas[sUpper].expiresAt > now) {
    return { success: true, lgas: memoryCache.lgas[sUpper].data };
  }

  const res = await fetchNipost(`/v1/reference/lgas?state=${encodeURIComponent(sUpper)}`);
  if (res.success && res.data?.lgas) {
    memoryCache.lgas[sUpper] = {
      data: res.data.lgas,
      expiresAt: now + CACHE_TTL_MS,
    };
    return { success: true, lgas: res.data.lgas };
  }
  return res;
}

/**
 * Segment-aware autocomplete query
 * @param {string} query Partial postcode (e.g. 'AB', 'FC 01', 'EK 01 A')
 */
async function searchAutocomplete(query) {
  if (!query || String(query).trim().length < 1) {
    return { success: false, error: "Query is required" };
  }
  const cleanQ = String(query).trim();
  const res = await fetchNipost(`/v1/search/autocomplete?q=${encodeURIComponent(cleanQ)}`);
  return res;
}

/**
 * Reverse geocode coordinate to official Nigerian Digital Postcode
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @param {number} maxDistanceM Max snap radius (up to 250m)
 */
async function reverseGeocode(lat, lng, maxDistanceM = 150) {
  if (lat === undefined || lng === undefined) {
    return { success: false, error: "lat and lng are required" };
  }
  const res = await fetchNipost(
    `/v1/search/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&max_distance_m=${encodeURIComponent(maxDistanceM)}`
  );
  return res;
}

/**
 * Graded Postcode Lookup (Level 1 is free)
 * @param {string} postcode Full postcode (e.g. 'FC-01-A01-KP-27')
 * @param {number} level Lookup level (default 1)
 */
async function lookupPostcode(postcode, level = 1) {
  if (!postcode) return { success: false, error: "Postcode is required" };
  const res = await fetchNipost(`/v1/lookup?code=${encodeURIComponent(postcode)}&level=${level}`);
  return res;
}

module.exports = {
  fetchNipost,
  getStates,
  getLgasByState,
  searchAutocomplete,
  reverseGeocode,
  lookupPostcode,
};
