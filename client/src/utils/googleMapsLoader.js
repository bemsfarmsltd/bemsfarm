// client/src/utils/googleMapsLoader.js
// Singleton loader for Google Maps JavaScript API with Places and Geometry libraries

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAkTC7CWqsjgUTIrGoZ5kxF6SLCsr5ErQc";

let loadPromise = null;

export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not defined"));
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
      existingScript.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error("Google Maps object not found after script load"));
      });
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-sdk";
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps loaded but google.maps namespace is missing"));
      }
    };

    script.onerror = (err) => {
      console.warn("Failed to load Google Maps SDK:", err);
      loadPromise = null;
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
  if (!input || input.trim().length < 2) return [];

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
  if (!placeId) return null;

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
 * Reverse geocode GPS coordinates to a formatted Nigerian address using Google Geocoder
 * @param {number} lat
 * @param {number} lng
 */
export async function reverseGeocodeGoogle(lat, lng) {
  try {
    const maps = await loadGoogleMaps();
    const geocoder = new maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode(
        { location: { lat: parseFloat(lat), lng: parseFloat(lng) } },
        (results, status) => {
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
            resolve(null);
          }
        }
      );
    });
  } catch (err) {
    console.warn("Reverse Geocode Google error:", err);
    return null;
  }
}
