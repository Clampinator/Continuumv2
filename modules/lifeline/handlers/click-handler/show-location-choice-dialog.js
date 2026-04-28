import { panToCoordinates } from '../../../span-graph-map.js';

/**
 * Shows a dialog to choose between origin and destination for a Level Span.
 * @param {object} eventData
 * @param {string} [actorId]
 */
export function showLocationChoiceDialog(eventData, actorId) {
    new Dialog({
        eventTitle: `Travel: ${eventData.eventTitle || 'Level Span'}`,
        content: `
            <style>
                .location-choice-dialog .dialog-buttons {
                    display: flex;
                    gap: 10px;
                    padding: 0 5px 5px 5px;
                }
                .location-choice-dialog .dialog-buttons button {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    white-space: nowrap;
                    min-width: 150px;
                    height: 40px;
                }
                .location-choice-dialog .location-label {
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: inline-block;
                    vertical-align: bottom;
                }
            </style>
            <div style="text-align: center; padding: 15px;">
                <p style="margin-bottom: 10px;">This event is a <strong>Level Span</strong> (Instant spatial teleport).</p>
                <p style="color: #aaa; font-size: 0.95em;">Select your destination on the map:</p>
            </div>
        `,
        buttons: {
            start: {
                label: `<i class="fas fa-sign-out-alt"></i> <span>Start:</span> <span class="location-label">${eventData.eventSpanFromLocation || 'Origin'}</span>`,
                callback: () => panToCoordinates(eventData.eventSpanFromLat, eventData.eventSpanFromLng, 12, actorId)
            },
            dest: {
                label: `<i class="fas fa-sign-in-alt"></i> <span>End:</span> <span class="location-label">${eventData.eventSpanToLocation || 'Arrival'}</span>`,
                callback: () => panToCoordinates(eventData.eventSpanToLat, eventData.eventSpanToLng, 12, actorId)
            }
        },
        default: "dest"
    }, { 
        classes: ["continuum-v2", "dialog", "location-choice-dialog"],
        width: "auto",
        height: "auto"
    }).render(true);
}
