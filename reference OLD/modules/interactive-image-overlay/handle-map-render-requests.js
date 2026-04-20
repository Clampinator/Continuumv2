/**
 * Processes a request to show a keyframe image overlay on the map.
 * @param {object} data - Keyframe and Map data.
 * @param {function} OverlayClass - The class to instantiate.
 */
export function handleMapRenderRequest(data, OverlayClass) {
    const activeGoogle = window.google;
    if (!OverlayClass || !data.map || !activeGoogle?.maps) return;
    
    const size = data.size || 0.01; 
    const bounds = new activeGoogle.maps.LatLngBounds(
        new activeGoogle.maps.LatLng(data.lat - size, data.lng - size),
        new activeGoogle.maps.LatLng(data.lat + size, data.lng + size)
    );
    
    new OverlayClass(bounds, data.imageUrl, data.map);
}