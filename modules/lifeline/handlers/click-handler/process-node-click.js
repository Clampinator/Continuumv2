import { openEventNodeDialog } from '../../../span-graph-ui-dialogs.js';
import { panToCoordinates } from '../../../span-graph-map.js';

const _hasCoord = (v) => v !== null && v !== undefined && v !== '';

/**
 * Processes a click on an Event Node.
 * @param {HTMLElement} target
 * @param {ActorSheet} sheet
 * @param {boolean} isEditRequest
 * @param {object} graphData
 * @returns {boolean} True if handled.
 */
export function processNodeClick(target, sheet, isEditRequest, graphData) {
    const node = target.closest('.graph-element-interactive');
    if (!node) return false;

    if (target.classList.contains('graph-node-now')) {
        if (!isEditRequest) return true;
    }

    const eventId = node.getAttribute('data-event-id');
    const eraId = node.getAttribute('data-era-id');
    const expIdAttr = node.getAttribute('data-exp-id');
    const expId = (expIdAttr === "" || expIdAttr === "null") ? null : expIdAttr;

    if (!eventId || !eraId) return true;

    const era = sheet.actor.system.eras[eraId];
    const eventData = expId
        ? era?.experiences[expId]?.events[eventId]
        : era?.events[eventId];

    if (!eventData) return true;

    const actorId = sheet.actor.id;

    if (isEditRequest) {
        openEventNodeDialog(sheet, {
            mode: 'edit',
            existingData: { ...eventData, id: eventId, eraId, expId }
        });
    } else {
        let lat, lng, zoom;

        if (eventData.isSpan) {
            // Determine location based on which span node was clicked.
            // Span-dest nodes pan to the arrival location; span-origin to the departure.
            const isDestNode = node.classList.contains('graph-node-span-dest');
            if (isDestNode) {
                lat = eventData.spanToLat;
                lng = eventData.spanToLng;
                zoom = eventData.spanToZoom || 12;
            } else {
                lat = eventData.spanFromLat;
                lng = eventData.spanFromLng;
                zoom = eventData.spanFromZoom || 12;
            }
        } else {
            // For level events, pull coords from the processed graph node first.
            const nodeData = graphData.levelNodes.find(n => n.eventId === eventId);
            if (nodeData) {
                lat = nodeData.lat;
                lng = nodeData.lng;
                zoom = nodeData.zoom;
            }

            // FALLBACK: If the processed node has no coords, read the raw event record.
            if (!_hasCoord(lat) || !_hasCoord(lng)) {
                lat = eventData.lat;
                lng = eventData.lng;
                zoom = eventData.zoom || 12;
            }
        }

        if (_hasCoord(lat) && _hasCoord(lng)) {
            panToCoordinates(lat, lng, zoom || 12, actorId);
        } else {
            ui.notifications.info(`Event "${eventData.title || 'Untitled'}" has no location data.`);
        }
    }

    return true;
}
