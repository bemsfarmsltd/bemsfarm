// client/src/utils/googleMapsLoader.js
// Singleton loader for Google Maps JavaScript API with Places and Geometry libraries

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAkTC7CWqsjgUTIrGoZ5kxF6SLCsr5ErQc";

let loadPromise = null;
let authFailed = false;
const authFailureListeners = new Set();

/**
 * Check if Google Maps has encountered an authentication or quota failure
 */
export function isGoogleMapsAuthFailed() {
  return authFailed || Boolean(typeof window !== "undefined" && window.__googleMapsAuthFailed);
}

/**
 * Register a listener when Google Maps encounters an authentication failure
 */
export function onGoogleMapsAuthError(callback) {
  if (typeof callback !== "function") return () => {};
  authFailureListeners.add(callback);
  if (isGoogleMapsAuthFailed()) {
    try {
      callback();
    } catch (e) {
      console.error(e);
    }
  }
  return () => authFailureListeners.delete(callback);
}

// Hook into global gm_authFailure to catch domain restriction, billing, or invalid key errors immediately
if (typeof window !== "undefined") {
  const previousAuthFailure = window.gm_authFailure;
  window.gm_authFailure = function () {
    authFailed = true;
    window.__googleMapsAuthFailed = true;
    console.warn("Google Maps JavaScript API authentication failed. Switching to OpenStreetMap fallback.");
    authFailureListeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("Error in gm_authFailure handler:", err);
      }
    });
    if (typeof previousAuthFailure === "function") {
      previousAuthFailure();
    }
  };
}

export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not defined"));
  }

  if (isGoogleMapsAuthFailed()) {
    return Promise.reject(new Error("Google Maps authentication failed"));
  }

  // Already loaded
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google.maps);
  }

  // Return existing in-flight loader promise
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists in document
    const existingScript = document.getElementById("google-maps-sdk");
    if (existingScript) {
      if (window.google?.maps?.places) {
        resolve(window.google.maps);
        return;
      }
      existingScript.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error("Google Maps object not found after script load"));
      });
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const callbackName = "__googleMapsCallback_" + Math.random().toString(36).substring(2, 9);
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps loaded but google.maps namespace is missing"));
      }
    };

    const script = document.createElement("script");
    script.id = "google-maps-sdk";
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&libraries=places,geometry&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;

    script.onerror = (err) => {
      console.warn("Failed to load Google Maps SDK:", err);
      loadPromise = null;
      delete window[callbackName];
      reject(err);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Fetch Nigerian landmark & address autocomplete predictions via Google Places AutocompleteService
 * @param {string} input - Text entered by customer
 * @param {google.maps.places.AutocompleteSessionToken} [sessionToken] - Session token for cost optimization
 */
export async function getGooglePlacePredictions(input, sessionToken = null) {
  if (!input || input.trim().length < 2 || isGoogleMapsAuthFailed()) return [];

  try {
    const maps = await loadGoogleMaps();
    const service = new maps.places.AutocompleteService();

    return new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: input.trim(),
          componentRestrictions: { country: "ng" }, // Restrict to Nigeria
          sessionToken: sessionToken || undefined,
        },
        (predictions, status) => {
          if (
            status === maps.places.PlacesServiceStatus.OK &&
            Array.isArray(predictions)
          ) {
            resolve(predictions);
          } else {
            resolve([]);
          }
        }
      );
    });
  } catch (err) {
    console.warn("Google Place Predictions error:", err);
    return [];
  }
}

/**
 * Get detailed location geometry (lat, lng, address parts) for a Google Place ID
 * @param {string} placeId - Google Place ID from autocomplete prediction
 * @param {google.maps.places.AutocompleteSessionToken} [sessionToken]
 */
export async function getGooglePlaceDetails(placeId, sessionToken = null) {
  if (!placeId || isGoogleMapsAuthFailed()) return null;

  try {
    const maps = await loadGoogleMaps();
    const dummyDiv = document.createElement("div");
    const placesService = new maps.places.PlacesService(dummyDiv);

    return new Promise((resolve) => {
      placesService.getDetails(
        {
          placeId,
          fields: ["geometry", "formatted_address", "address_components", "name"],
          sessionToken: sessionToken || undefined,
        },
        (place, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && place && place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            let streetNumber = "";
            let route = "";
            let city = "";
            let lga = "";
            let state = "";
            let postalCode = "";

            if (Array.isArray(place.address_components)) {
              for (const comp of place.address_components) {
                const types = comp.types || [];
                if (types.includes("street_number")) streetNumber = comp.long_name;
                if (types.includes("route")) route = comp.long_name;
                if (types.includes("locality")) city = comp.long_name;
                if (types.includes("administrative_area_level_2")) lga = comp.long_name;
                if (types.includes("administrative_area_level_1")) state = comp.long_name;
                if (types.includes("postal_code")) postalCode = comp.long_name;
              }
            }

            const cleanAddress = place.formatted_address || `${streetNumber} ${route}`.trim() || place.name;

            resolve({
              latitude: lat,
              longitude: lng,
              formatted_address: cleanAddress,
              name: place.name || cleanAddress,
              street: route || streetNumber ? `${streetNumber} ${route}`.trim() : "",
              city: city || lga || "Umuahia",
              lga: lga || city,
              state: state || "Abia State",
              postal_code: postalCode || "440221",
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  } catch (err) {
    console.warn("Google Place Details error:", err);
    return null;
  }
}

/**
 * Reverse geocode via OpenStreetMap Nominatim (reliable zero-key fallback)
 */
export async function reverseGeocodeNominatim(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;
    const a = data.address;
    const city = a.city || a.town || a.municipality || a.county || "";
    const lga = a.county || a.state_district || city;
    const state = a.state || "";
    const postalCode = a.postcode || "";
    return {
      formatted_address: data.display_name || "",
      city: city || lga,
      lga: lga || city,
      state: state,
      postal_code: postalCode,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Reverse geocode GPS coordinates to a formatted Nigerian address using Google Geocoder,
 * with graceful OpenStreetMap fallback if Google Maps is restricted or offline
 * @param {number} lat
 * @param {number} lng
 */
export async function reverseGeocodeGoogle(lat, lng) {
  if (isGoogleMapsAuthFailed()) {
    return reverseGeocodeNominatim(lat, lng);
  }

  try {
    const maps = await loadGoogleMaps();
    const geocoder = new maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode(
        { location: { lat: parseFloat(lat), lng: parseFloat(lng) } },
        async (results, status) => {
          if (status === "OK" && Array.isArray(results) && results.length > 0) {
            const top = results[0];
            let city = "";
            let lga = "";
            let state = "";
            let postalCode = "";

            for (const comp of top.address_components || []) {
              const types = comp.types || [];
              if (types.includes("locality")) city = comp.long_name;
              if (types.includes("administrative_area_level_2")) lga = comp.long_name;
              if (types.includes("administrative_area_level_1")) state = comp.long_name;
              if (types.includes("postal_code")) postalCode = comp.long_name;
            }

            resolve({
              formatted_address: top.formatted_address,
              city: city || lga,
              lga: lga || city,
              state: state,
              postal_code: postalCode,
            });
          } else {
            const fallback = await reverseGeocodeNominatim(lat, lng);
            resolve(fallback);
          }
        }
      );
    });
  } catch (err) {
    console.warn("Reverse Geocode Google error, trying Nominatim:", err);
    return reverseGeocodeNominatim(lat, lng);
  }
}
