
export function isCoordsValid(lat, lng) {
    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);
    if (isNaN(fLat) || isNaN(fLng)) return false;
    return (fLat >= -90 && fLat <= 90) && (fLng >= -180 && fLng <= 180);
}
