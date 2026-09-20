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

// Coordinate centers for key Nigerian hubs for fallback zone matching
const HUB_COORDINATES = {
  umuahia: { lat: 5.5245, lng: 7.4912, zoneId: "ZONE001", maxRadiusKm: 25 },
  aba:     { lat: 5.1065, lng: 7.3667, zoneId: "ZONE002", maxRadiusKm: 35 },
};

// Match location (text + coords) against delivery_zones table
async function matchDeliveryZone(lat, lng, addressText, cityName, stateName) {
  try {
    const zonesResult = await pool.query(
      "SELECT * FROM delivery_zones WHERE status = 'active' ORDER BY CAST(delivery_fee AS NUMERIC) ASC"
    );
    const zones = zonesResult.rows;

    const fullSearchText = `${addressText || ""} ${cityName || ""} ${stateName || ""}`.toLowerCase();

    // 1. First priority: Check coordinate proximity to Umuahia / Aba hubs
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (!isNaN(latNum) && !isNaN(lngNum)) {
        // Check Umuahia (< 25km)
        const distUmuahia = calculateDistanceKm(latNum, lngNum, HUB_COORDINATES.umuahia.lat, HUB_COORDINATES.umuahia.lng);
        if (distUmuahia <= HUB_COORDINATES.umuahia.maxRadiusKm) {
          const z = zones.find(z => z.zone_id === "ZONE001");
          if (z) return { ...z, matchType: "gps_proximity", distanceKm: Math.round(distUmuahia * 10) / 10 };
        }

        // Check Aba (< 35km)
        const distAba = calculateDistanceKm(latNum, lngNum, HUB_COORDINATES.aba.lat, HUB_COORDINATES.aba.lng);
        if (distAba <= HUB_COORDINATES.aba.maxRadiusKm) {
          const z = zones.find(z => z.zone_id === "ZONE002");
          if (z) return { ...z, matchType: "gps_proximity", distanceKm: Math.round(distAba * 10) / 10 };
        }
      }
    }

    // 2. Second priority: Keyword match against coverage_areas in database
    for (const zone of zones) {
      const areas = Array.isArray(zone.coverage_areas)
        ? zone.coverage_areas
        : String(zone.areas_covered || "").split(/[,;]/);

      for (const area of areas) {
        const cleanArea = area.trim().toLowerCase();
        if (cleanArea.length >= 3 && fullSearchText.includes(cleanArea)) {
          return { ...zone, matchType: "keyword_match", matchedArea: area.trim() };
        }
      }
    }

    // 3. Fallback: If in Nigeria but outside immediate hub, return Nationwide (ZONE005)
    const nationwideZone = zones.find(z => z.zone_id === "ZONE005");
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
      "SELECT zone_id, zone_name, delivery_fee, min_order_value, estimated_delivery_time, coverage_areas, areas_covered FROM delivery_zones WHERE status = 'active' ORDER BY CAST(delivery_fee AS NUMERIC) ASC"
    );
    res.json({ zones: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/locations/search ────────────────────────────────────────
// Instant address search & autocomplete powered by OpenStreetMap Nominatim
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const cleanQuery = q.trim();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=ng&addressdetails=1&limit=6`;
    const data = await fetchJson(url);

    if (!Array.isArray(data)) {
      return res.json({ results: [] });
    }

    const results = data.map((item) => {
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
      const state = addr.state || "";
      return {
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        street: addr.road || addr.suburb || addr.neighbourhood || "",
        city: city,
        state: state,
        country: addr.country || "Nigeria",
        type: item.type,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error("Location search error:", err.message);
    res.json({ results: [] });
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
    let detectedState = (state || "").trim();
    let detectedStreet = "";

    // 1. If GPS coordinates provided, reverse geocode via Nominatim
    if (finalLat && finalLng && !isNaN(finalLat) && !isNaN(finalLng)) {
      const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${finalLat}&lon=${finalLng}&zoom=18&addressdetails=1`;
      const revData = await fetchJson(revUrl);

      if (revData && revData.address) {
        const a = revData.address;
        detectedStreet = a.road || a.pedestrian || a.suburb || a.neighbourhood || "";
        detectedCity = detectedCity || a.city || a.town || a.village || a.county || a.state_district || "";
        detectedState = detectedState || a.state || "";
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
        detectedCity = detectedCity || a.city || a.town || a.village || a.county || "";
        detectedState = detectedState || a.state || "";
        formattedAddress = top.display_name;
      }
    }

    // 3. Match against delivery zones
    const matchedZone = await matchDeliveryZone(
      finalLat,
      finalLng,
      formattedAddress,
      detectedCity,
      detectedState
    );

    res.json({
      verified: true,
      latitude: finalLat,
      longitude: finalLng,
      formatted_address: formattedAddress || "Verified Delivery Address",
      street: detectedStreet,
      city: detectedCity || "Umuahia",
      state: detectedState || "Abia",
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

module.exports = router;
