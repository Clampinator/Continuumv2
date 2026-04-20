/*
Geocoding via Nominatim (OpenStreetMap).
Replaces the Google Maps Geocoder API.
Usage policy: 1 request/second, no bulk geocoding.
*/

const BASE    = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'en' };

// Plus Code alphabet (Google Open Location Code)
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\s*(.*)/i;

/*
Strip a Google Plus Code prefix from an address string.
"M6G7+RX Coeur d'Alene, Idaho, USA" -> "Coeur d'Alene, Idaho, USA"
Returns the original string unchanged if no Plus Code is detected.
*/
function _stripPlusCode(address) {
    const match = address.trim().match(PLUS_CODE_RE);
    if (!match) return address;
    const remainder = match[1].trim();
    return remainder || null; // null if the entire string was just a bare code
}

/*
Forward geocode: address string -> { lat, lng, formattedAddress, zoom }
Returns null if nothing is found or on network error.
*/
export async function geocodeAddress(address) {
    if (!address?.trim()) return null;
    console.log(`[LSS] Geocoding address: "${address}"`);
    const cleaned = _stripPlusCode(address.trim());
    if (!cleaned) {
        console.log(`[LSS] Geocoding FAILED - bare Plus Code without place name: "${address}"`);
        ui.notifications?.warn(`Cannot geocode a bare Plus Code without a place name. Add a city name after the code.`);
        return null;
    }
    const url = `${BASE}/search?format=json&q=${encodeURIComponent(cleaned)}&limit=1`;
    console.log(`[LSS] Searching Nominatim for: "${cleaned}"`);
    try {
        const res  = await fetch(url, { headers: HEADERS });
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) {
            console.log(`[LSS] Geocoding FAILED - no results for: "${cleaned}"`);
            ui.notifications?.warn(`No location found for "${cleaned}". Try a more specific address.`);
            return null;
        }
        console.log(`[LSS] Geocoding SUCCESS for "${cleaned}" -> "${data[0].display_name}" at (${data[0].lat}, ${data[0].lon})`);
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            formattedAddress: data[0].display_name,
            zoom: 12
        };
    } catch (err) {
        console.warn('[LSS] Geocoding FAILED - network error:', err);
        ui.notifications?.warn('Geocoding failed. Check your internet connection and try again.');
        return null;
    }
}

/*
Reverse geocode: lat/lng -> address string.
Falls back to coordinate string on error.
*/
export async function reverseGeocode(lat, lng) {
    const url = `${BASE}/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
        const res  = await fetch(url, { headers: HEADERS });
        const data = await res.json();
        return data?.display_name || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    } catch {
        return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    }
}
