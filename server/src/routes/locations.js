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
        const state = addr.state || "";
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const dist = !isNaN(lat) && !isNaN(lon) ? Math.round(calculateDistanceKm(baseLat, baseLng, lat, lon) * 10) / 10 : 0;
        return {
          display_name: item.display_name,
          latitude: lat,
          longitude: lon,
          street: addr.road || addr.suburb || addr.neighbourhood || "",
          city: city,
          state: state,
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
          state: top.state,
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
            state: top.state,
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
              state: "Abia",
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
