const GEOCODE_DELAY_MS = 1500;
const GEOCODE_BATCH_SIZE = 5;
const GEOCODE_BATCH_PAUSE_MS = 6000;

function resolveFromLocationActor(locationName) {
  if (!locationName) return null;
  const locationActor = game.actors?.find(a =>
    a.type === 'location' &&
    a.name.toLowerCase() === locationName.toLowerCase()
  );
  if (!locationActor) return null;
  const lat = locationActor.system?.map?.lat ?? null;
  const lng = locationActor.system?.map?.lng ?? null;
  if (lat === null || lng === null) return null;
  return { lat, lng, zoom: 12 };
}

// Sentinel value returned when Nominatim rate-limits us (HTTP 429).
const GEOCODE_RATE_LIMITED = Symbol('rateLimited');

async function geocodeWithNominatim(locationName) {
  if (!locationName?.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName.trim())}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' }
    });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn(`[NPC Geocoder] Rate limited by Nominatim for "${locationName}".`);
        return GEOCODE_RATE_LIMITED;
      }
      console.warn(`[NPC Geocoder] Nominatim returned ${res.status} for "${locationName}".`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      zoom: 12,
      displayName: data[0].display_name
    };
  } catch (err) {
    console.warn(`[NPC Geocoder] Failed for "${locationName}": ${err.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodeLocations(locations, addLog) {
  const uniqueLocations = [...new Set(locations.filter(l => l && l.trim()))];
  const geoMap = new Map();
  let resolved = 0;
  let geocoded = 0;
  let failed = 0;
  let rateLimited = false;

  const unresolved = [];

  for (const loc of uniqueLocations) {
    const fromActor = resolveFromLocationActor(loc);
    if (fromActor) {
      geoMap.set(loc, fromActor);
      resolved++;
      if (addLog) addLog(`Location "${loc}" resolved from world data.`);
      continue;
    }
    unresolved.push(loc);
  }

  for (let i = 0; i < unresolved.length; i++) {
    if (rateLimited) {
      geoMap.set(unresolved[i], { lat: null, lng: null, zoom: null });
      failed++;
      continue;
    }

    if (i > 0 && i % GEOCODE_BATCH_SIZE === 0) {
      if (addLog) addLog(`Geocoding batch pause (${i}/${unresolved.length})...`);
      await sleep(GEOCODE_BATCH_PAUSE_MS);
    }

    const loc = unresolved[i];
    if (addLog) addLog(`Geocoding "${loc}" (${i + 1}/${unresolved.length})...`);
    const result = await geocodeWithNominatim(loc);

    if (result === GEOCODE_RATE_LIMITED) {
      rateLimited = true;
      geoMap.set(loc, { lat: null, lng: null, zoom: null });
      failed++;
      if (addLog) addLog(`Rate limited by Nominatim. Skipping remaining locations.`);
      continue;
    } else if (result === null) {
      geoMap.set(loc, { lat: null, lng: null, zoom: null });
      failed++;
      if (addLog) addLog(`Could not geocode "${loc}". Coordinates will be blank.`);
    } else {
      geoMap.set(loc, { lat: result.lat, lng: result.lng, zoom: result.zoom });
      geocoded++;
      if (addLog) addLog(`Found "${loc}" at (${result.lat.toFixed(2)}, ${result.lng.toFixed(2)}).`);
    }

    await sleep(GEOCODE_DELAY_MS);
  }

  if (addLog) {
    addLog(`Location resolution complete: ${resolved} from world, ${geocoded} geocoded, ${failed} unresolved.`);
  }

  return geoMap;
}
