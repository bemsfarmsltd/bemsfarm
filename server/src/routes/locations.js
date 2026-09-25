// server/src/routes/locations.js
// Mounted at /api/locations
// Free OpenStreetMap Nominatim Geocoding, Address Verification & Zone Matching

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const https = require("https");

// Utility to make HTTPS request with User-Agent required by Nominatim
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "BemsFarms-Logistics-Platform/2.0 (contact@bemsfarms.com)",
        "Accept": "application/json",
      },
    };

    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      });
    }).on("error", (err) => {
      console.warn("Nominatim fetch error:", err.message);
      resolve(null);
    });
  });
}

// Distance calculation using Haversine formula (km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Comprehensive Nigerian Postal Code Dictionary mapping by state and city/LGA
const NIGERIA_POSTAL_CODES = {
  "abia": { default: "440001", "umuahia": "440221", "aba": "450211", "ohafia": "442101", "arochukwu": "442103", "osisioma": "450101", "ugwunagbo": "450102", "ukwa": "452101" },
  "lagos": { default: "100001", "ikeja": "100271", "lekki": "105101", "ibeju-lekki": "105101", "victoria island": "101241", "ikoyi": "101233", "surulere": "101283", "yaba": "101212", "alimosho": "100275", "ajah": "105102", "festac": "102312", "badagry": "103101", "ikorodu": "104101", "epe": "106101", "maryland": "100211", "ogba": "100218" },
  "abuja": { default: "900001", "garki": "900241", "wuse": "900288", "maitama": "900271", "asokoro": "900231", "gwarinpa": "900108", "kubwa": "901101", "lugbe": "900107", "central area": "900211" },
  "fct": { default: "900001", "abuja": "900001", "garki": "900241", "wuse": "900288" },
  "rivers": { default: "500001", "port harcourt": "500272", "obio-akpor": "500102", "eleme": "501101", "diobu": "500261" },
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

function resolvePostalCode(stateName, cityName, postcodeHint = "", addressText = "") {
  if (postcodeHint && String(postcodeHint).trim().length >= 4 && !isNaN(Number(String(postcodeHint).trim()))) {
    return String(postcodeHint).trim();
  }
  if (addressText) {
    const match6 = String(addressText).match(/\b(\d{6})\b/);
    if (match6) return match6[1];
    const match5 = String(addressText).match(/\b(\d{5})\b/);
    if (match5) return match5[1];
  }
  const sClean = String(stateName || "").toLowerCase().replace(/state/gi, '').trim();
  const cClean = String(cityName || "").toLowerCase().trim();
  const aClean = String(addressText || "").toLowerCase().trim();
  const stateDict = NIGERIA_POSTAL_CODES[sClean] || NIGERIA_POSTAL_CODES["abia"];
  if (stateDict) {
    for (const [k, code] of Object.entries(stateDict)) {
      if (k !== "default" && (cClean.includes(k) || aClean.includes(k))) {
        return code;
      }
    }
    return stateDict.default || "440001";
  }
  return "440001";
}

// Match location (text + coords) dynamically against delivery_zones table
async function matchDeliveryZone(lat, lng, addressText, cityName, stateName) {
  try {
    const zonesResult = await pool.query(
      "SELECT * FROM delivery_zones WHERE status = 'active' ORDER BY CAST(delivery_fee AS NUMERIC) ASC"
    );
    const zones = zonesResult.rows;
    if (!zones.length) return null;

    const fullSearchText = `${addressText || ""} ${cityName || ""} ${stateName || ""}`.toLowerCase();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasCoords = !isNaN(latNum) && !isNaN(lngNum) && (latNum !== 0 || lngNum !== 0);

    // 1. First priority: Dynamic Geodesic Distance / Closest Zone within Radius
    if (hasCoords) {
      // Find all zones that have center coordinates configured
      const zonesWithDistances = zones
        .filter(z => z.center_lat !== null && z.center_lng !== null)
        .map(z => {
          const zLat = parseFloat(z.center_lat);
          const zLng = parseFloat(z.center_lng);
          const distKm = calculateDistanceKm(latNum, lngNum, zLat, zLng);
          const radiusKm = parseFloat(z.radius_km) || 50;
          return {
            ...z,
            distanceKm: Math.round(distKm * 10) / 10,
            radiusKm,
            isWithinRadius: distKm <= radiusKm,
          };
        });

      // Filter zones where the user's GPS is inside the zone's operational radius
      const matchingRadialZones = zonesWithDistances.filter(z => z.isWithinRadius);

      if (matchingRadialZones.length > 0) {
        // Sort by closest distance to zone center, giving preference to more specific/smaller radius
        matchingRadialZones.sort((a, b) => {
          if (a.radiusKm !== b.radiusKm) return a.radiusKm - b.radiusKm;
          return a.distanceKm - b.distanceKm;
        });

        const bestZone = matchingRadialZones[0];
        return {
          ...bestZone,
          matchType: "closest_gps_zone",
          distanceKm: bestZone.distanceKm,
        };
      }

      // If outside all configured specific radii, check if close to any local hub
      if (zonesWithDistances.length > 0) {
        zonesWithDistances.sort((a, b) => a.distanceKm - b.distanceKm);
        const closestHub = zonesWithDistances[0];
        if (closestHub.distanceKm <= (closestHub.radiusKm * 1.5)) {
          return {
            ...closestHub,
            matchType: "nearest_hub_proximity",
            distanceKm: closestHub.distanceKm,
          };
        }
      }
    }

    // 2. Second priority: Keyword match against coverage_areas in database
    for (const zone of zones) {
      const areas = Array.isArray(zone.coverage_areas)
        ? zone.coverage_areas
        : String(zone.areas_covered || "").split(/[,;]/);

      for (const area of areas) {
        const cleanArea = String(area).trim().toLowerCase();
        if (cleanArea.length >= 3 && fullSearchText.includes(cleanArea)) {
          return { ...zone, matchType: "keyword_match", matchedArea: String(area).trim() };
        }
      }
    }

    // 3. Fallback: If nationwide zone configured, return it
    const nationwideZone = zones.find(z => z.zone_id === "ZONE005" || String(z.zone_name).toLowerCase().includes("nationwide"));
    if (nationwideZone) {
      return { ...nationwideZone, matchType: "nationwide_fallback" };
    }

    // 4. Default to first active zone
    return zones[0] || null;
  } catch (err) {
    console.error("matchDeliveryZone error:", err.message);
    return null;
  }
}

// ── GET /api/locations/zones ─────────────────────────────────────────
// Fetch all active delivery zones and coverage
router.get("/zones", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT zone_id, zone_name, delivery_fee, min_order_value, estimated_delivery_time, coverage_areas, areas_covered, center_lat, center_lng, radius_km, color_hex FROM delivery_zones WHERE status = 'active' ORDER BY CAST(delivery_fee AS NUMERIC) ASC"
    );
    res.json({ zones: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/locations/search ────────────────────────────────────────
// Instant address search & autocomplete powered by OpenStreetMap Nominatim with Progressive Fallback
router.get("/search", async (req, res) => {
  try {
    const { q, ref_lat, ref_lng } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [], exactMatch: false });
    }

    const cleanQuery = q.trim();
    const baseLat = parseFloat(ref_lat) || 5.5245; // Umuahia Base default
    const baseLng = parseFloat(ref_lng) || 7.4912;

    const parseNominatimItems = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map((item) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
        const lga = addr.county || addr.state_district || addr.suburb || city;
        const state = addr.state || "";
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const dist = !isNaN(lat) && !isNaN(lon) ? Math.round(calculateDistanceKm(baseLat, baseLng, lat, lon) * 10) / 10 : 0;
        const postcode = resolvePostalCode(state, city || lga, addr.postcode || addr.postal_code || "");
        return {
          display_name: item.display_name,
          latitude: lat,
          longitude: lon,
          street: addr.road || addr.suburb || addr.neighbourhood || "",
          city: city || lga,
          lga: lga,
          state: state,
          postal_code: postcode,
          postcode: postcode,
          country: addr.country || "Nigeria",
          type: item.type,
          distance_km: dist,
        };
      });
    };

    // 1. Direct Search with full input
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + (cleanQuery.toLowerCase().includes("nigeria") ? "" : ", Nigeria"))}&countrycodes=ng&addressdetails=1&limit=6`;
    let data = await fetchJson(url);
    let parsedResults = parseNominatimItems(data);

    if (parsedResults.length > 0) {
      return res.json({
        results: parsedResults,
        exactMatch: true,
        searchedQuery: cleanQuery,
      });
    }

    // 2. Progressive Fallback Decomposition:
    // E.g., "Block 308 Bnb Mall, beside Golf bus stop, Ibeju-Lekki, Lagos state"
    // Split by commas and remove hyper-specific descriptors to find closest recognized landmark/area
    const parts = cleanQuery
      .split(/[,;\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    let closestMatch = null;
    let fallbackResults = [];

    // Try successive sub-combinations (from right to left: Area + City + State)
    for (let i = 1; i < parts.length; i++) {
      const subQuery = parts.slice(i).join(", ");
      if (subQuery.length < 3) continue;

      const subUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(subQuery + ", Nigeria")}&countrycodes=ng&addressdetails=1&limit=4`;
      const subData = await fetchJson(subUrl);
      const subParsed = parseNominatimItems(subData);

      if (subParsed.length > 0) {
        fallbackResults = subParsed;
        const top = subParsed[0];
        closestMatch = {
          display_name: top.display_name,
          latitude: top.latitude,
          longitude: top.longitude,
          city: top.city,
          lga: top.lga,
          state: top.state,
          postal_code: top.postal_code,
          postcode: top.postcode,
          distance_km: top.distance_km,
          matched_query: subQuery,
          reason: `Exact building or landmark "${parts[0]}" not found on map database. Closest recognized area found: "${subQuery}".`,
        };
        break;
      }
    }

    // If still no result, try searching just words without common stop prefixes ("beside", "opposite", "block", "no", "flat")
    if (!closestMatch && cleanQuery.length > 5) {
      const simplified = cleanQuery
        .replace(/\b(block|flat|shop|suite|no|plot|beside|opposite|behind|near|close to|along|off)\b\s*[0-9A-Za-z-]*/gi, '')
        .trim();
      
      if (simplified.length >= 3 && simplified !== cleanQuery) {
        const simUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simplified + ", Nigeria")}&countrycodes=ng&addressdetails=1&limit=3`;
        const simData = await fetchJson(simUrl);
        const simParsed = parseNominatimItems(simData);
        if (simParsed.length > 0) {
          fallbackResults = simParsed;
          const top = simParsed[0];
          closestMatch = {
            display_name: top.display_name,
            latitude: top.latitude,
            longitude: top.longitude,
            city: top.city,
            lga: top.lga,
            state: top.state,
            postal_code: top.postal_code,
            postcode: top.postcode,
            distance_km: top.distance_km,
            matched_query: simplified,
            reason: `Exact location not indexed. Found nearest regional landmark: "${top.display_name}".`,
          };
        }
      }
    }

    // 3. Fallback to Delivery Zones table if database has configured areas
    if (!closestMatch) {
      const zoneCheck = await pool.query(
        "SELECT * FROM delivery_zones WHERE status = 'active' ORDER BY CAST(delivery_fee AS NUMERIC) ASC"
      );
      for (const zone of zoneCheck.rows) {
        const areas = Array.isArray(zone.coverage_areas) ? zone.coverage_areas : String(zone.areas_covered || "").split(/[,;]/);
        for (const area of areas) {
          const aClean = String(area).trim();
          if (aClean.length >= 3 && cleanQuery.toLowerCase().includes(aClean.toLowerCase())) {
            const zLat = parseFloat(zone.center_lat) || baseLat;
            const zLng = parseFloat(zone.center_lng) || baseLng;
            closestMatch = {
              display_name: `${aClean}, ${zone.zone_name}, Abia State`,
              latitude: zLat,
              longitude: zLng,
              city: "Umuahia",
              lga: "Umuahia North",
              state: "Abia",
              postal_code: "440221",
              postcode: "440221",
              distance_km: Math.round(calculateDistanceKm(baseLat, baseLng, zLat, zLng) * 10) / 10,
              matched_query: aClean,
              zone_id: zone.zone_id,
              delivery_fee: parseFloat(zone.delivery_fee) || 1000,
              reason: `Matched verified operational zone: "${zone.zone_name}".`,
            };
            break;
          }
        }
        if (closestMatch) break;
      }
    }

    res.json({
      results: fallbackResults,
      exactMatch: false,
      searchedQuery: cleanQuery,
      closestMatch: closestMatch || null,
    });
  } catch (err) {
    console.error("Location search error:", err.message);
    res.json({ results: [], exactMatch: false, closestMatch: null });
  }
});

// ── POST /api/locations/verify ───────────────────────────────────────
// Reverse-geocodes or verifies an address / GPS pin and returns the matched delivery zone
router.post("/verify", async (req, res, next) => {
  try {
    const { latitude, longitude, address, city, state } = req.body;

    let finalLat = latitude ? parseFloat(latitude) : null;
    let finalLng = longitude ? parseFloat(longitude) : null;
    let formattedAddress = (address || "").trim();
    let detectedCity = (city || "").trim();
    let detectedLGA = "";
    let detectedState = (state || "").trim();
    let detectedStreet = "";
    let detectedPostcode = "";

    // 1. If GPS coordinates provided, reverse geocode via Nominatim
    if (finalLat && finalLng && !isNaN(finalLat) && !isNaN(finalLng)) {
      const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${finalLat}&lon=${finalLng}&zoom=18&addressdetails=1`;
      const revData = await fetchJson(revUrl);

      if (revData && revData.address) {
        const a = revData.address;
        detectedStreet = a.road || a.pedestrian || a.suburb || a.neighbourhood || "";
        detectedCity = a.city || a.town || a.village || a.county || a.state_district || detectedCity || "";
        detectedLGA = a.county || a.state_district || a.suburb || detectedCity;
        detectedState = a.state || detectedState || "";
        detectedPostcode = a.postcode || a.postal_code || "";
        if (!formattedAddress || formattedAddress.length < 5) {
          formattedAddress = revData.display_name || `${detectedStreet}, ${detectedCity}, ${detectedState}`.trim();
        }
      }
    } 
    // 2. If only address text provided without coords, forward geocode
    else if (formattedAddress && formattedAddress.length >= 3) {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedAddress + (detectedCity ? ", " + detectedCity : "") + ", Nigeria")}&countrycodes=ng&addressdetails=1&limit=1`;
      const geoData = await fetchJson(geoUrl);

      if (Array.isArray(geoData) && geoData.length > 0) {
        const top = geoData[0];
        finalLat = parseFloat(top.lat);
        finalLng = parseFloat(top.lon);
        const a = top.address || {};
        detectedStreet = a.road || a.suburb || detectedStreet;
        detectedCity = a.city || a.town || a.village || a.county || detectedCity || "";
        detectedLGA = a.county || a.state_district || detectedCity;
        detectedState = a.state || detectedState || "";
        detectedPostcode = a.postcode || a.postal_code || "";
        formattedAddress = top.display_name;
      }
    }

    const postalCode = resolvePostalCode(detectedState, detectedCity || detectedLGA, detectedPostcode, formattedAddress || address || "");

    // 3. Match against delivery zones
    const matchedZone = await matchDeliveryZone(
      finalLat,
      finalLng,
      formattedAddress,
      detectedCity || detectedLGA,
      detectedState
    );

    res.json({
      verified: true,
      latitude: finalLat,
      longitude: finalLng,
      formatted_address: formattedAddress || "Verified Delivery Address",
      street: detectedStreet,
      city: detectedCity || detectedLGA || "Umuahia",
      lga: detectedLGA || detectedCity || "Umuahia North",
      state: detectedState || "Abia",
      postal_code: postalCode,
      postcode: postalCode,
      country: "Nigeria",
      zone: matchedZone ? {
        zone_id: matchedZone.zone_id,
        zone_name: matchedZone.zone_name,
        delivery_fee: parseFloat(matchedZone.delivery_fee) || 1000,
        estimated_delivery_time: matchedZone.estimated_delivery_time || "1–2 hours",
        match_type: matchedZone.matchType,
      } : null,
      message: "Location successfully verified and mapped to delivery zone",
    });
  } catch (err) {
    console.error("Location verify error:", err.message);
    next(err);
  }
});

router.matchDeliveryZone = matchDeliveryZone;
router.resolvePostalCode = resolvePostalCode;
module.exports = router;
