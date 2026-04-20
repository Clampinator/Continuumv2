/**
 * Populates location and zoom data into the event object.
 * @param {object} eventData
 * @param {object} formData
 */
export function assembleLocationData(eventData, formData) {
    eventData.location = formData.eventLocation || "";
    eventData.lat = parseFloat(formData.eventLat) || null;
    eventData.lng = parseFloat(formData.eventLng) || null;
    eventData.zoom = formData.eventZoom || null;
}
