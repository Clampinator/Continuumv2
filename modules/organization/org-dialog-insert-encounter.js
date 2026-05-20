/**
 * org-dialog-insert-encounter.js
 *
 * Dialog for inserting a new Encounter by clicking a track segment on the
 * Operational Map timeline. Mirrors the Lifeline's insert-event flow.
 */

import { normalizeDateInput, timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { renderDatePicker } from '../span-graph-ui-helpers.js';
import { activateDatePickers } from '../date-picker.js';
import { panToLocation, getMapCenterLocation } from '../span-graph-map.js';
import { safeFloat } from './org-dialog-helpers.js';

function buildGeoButtons() {
    return `
        <button type="button" class="geo-btn locate-btn" eventTitle="Locate on Map"><i class="fas fa-map-marker-alt"></i></button>
        <button type="button" class="geo-btn grab-btn" eventTitle="Grab Map Centre"><i class="fas fa-crosshairs"></i></button>
    `;
}

function attachGeoButtonListeners(html) {
    // ENTER on location inputs triggers Locate button
    html.on('keydown', '.input-with-btn input[type="text"]', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const container = $(event.currentTarget).closest('.input-with-btn');
            const locateBtn = container.find('.locate-btn');
            if (locateBtn.length) locateBtn.click();
        }
    });

    html.find('.locate-btn, .grab-btn').on('click', async (e) => {
        const btn    = $(e.currentTarget);
        const isGrab = btn.hasClass('grab-btn');
        const wrap   = btn.closest('.input-with-btn');
        const locIn  = wrap.find('input[name="eventLocation"]');
        const latIn  = wrap.find('input[name="eventLat"]');
        const lngIn  = wrap.find('input[name="eventLng"]');
        const zoomIn = wrap.find('input[name="eventZoom"]');

        btn.find('i').attr('class', 'fas fa-spinner fa-spin');
        const result = isGrab ? await getMapCenterLocation() : await panToLocation(locIn.val());
        btn.find('i').attr('class', isGrab ? 'fas fa-crosshairs' : 'fas fa-map-marker-alt');

        if (result) {
            latIn.val(result.lat);
            lngIn.val(result.lng);
            zoomIn.val(result.zoom || 12);
            if (result.formattedAddress) locIn.val(result.formattedAddress);
        }
    });
}

/**
 * Opens the "Insert Encounter" dialog when the user clicks on a track segment.
 *
 * @param {object}   segmentInfo    - hoveredSegment from viewState
 *   { worldTime, nodeA, nodeB, track, screenX, screenY }
 * @param {ActorSheet} sheet        - org actor sheet
 * @param {object}   graphData      - current graphData
 * @param {Function} onClose        - called when dialog closes (clear ghost / re-render)
 */
export function showOrgInsertEncounterDialog(segmentInfo, sheet, graphData, onClose) {
    const { worldTime, nodeA, track } = segmentInfo;
    const { date, time } = timestampToDateString(worldTime);

    // ── Operation context ────────────────────────────────────────────────────
    const sourcePhaseId = nodeA?.phaseId ?? null;
    const sourceOpId    = nodeA?.opId    ?? null;
    const phases        = sheet.actor.system.phases || {};

    let opOptionsHtml = '';
    Object.values(phases).forEach(phase => {
        const ops = Object.values(phase.operations || {});
        if (!ops.length) return;
        opOptionsHtml += `<optgroup label="${phase.name || 'Phase'}">`;
        ops.forEach(op => {
            const isSource = (phase.id === sourcePhaseId && op.id === sourceOpId);
            const isOpen   = !op.dateTo || op.dateTo.trim() === '';
            opOptionsHtml += `<option value="continue:${phase.id}:${op.id}" ${isSource ? 'selected' : ''}>Continue "${op.name || 'Operation'}"</option>`;
            if (isOpen) {
                opOptionsHtml += `<option value="switch:${phase.id}:${op.id}">Switch → Close "${op.name || 'Operation'}" &amp; Start New</option>`;
            }
        });
        opOptionsHtml += `</optgroup>`;
    });
    opOptionsHtml += `<option value="new">Start New Operation...</option>`;

    const dialogStyle = `<style>
        .continuum-dialog-form { display:flex; flex-direction:column; gap:10px; }
        .input-with-btn { display:flex; align-items:center; width:100%; gap:5px; }
        .input-with-btn input { flex:1; }
        .geo-btn { flex:0 0 32px; height:32px; padding:0; display:flex; align-items:center;
                   justify-content:center; background:#333; border:1px solid #555;
                   color:#8ecae6; border-radius:4px; cursor:pointer; }
    </style>`;

    const content = `
        <form class="continuum-dialog-form" autocomplete="off">
            ${dialogStyle}
            <div class="form-group">
                <label>Engagement Name</label>
                <input type="text" name="name" value="New Engagement" autofocus />
            </div>
            <div class="form-group">
                <label>Operation Context</label>
                <select name="opAction" id="orgInsertOpActionSelect">${opOptionsHtml}</select>
            </div>
            <div class="form-group" id="newOpNameGroup" style="display:none;">
                <label>New Operation Name</label>
                <input type="text" name="newOpName" value="New Operation" />
            </div>
            ${renderDatePicker('date', date, 'Date')}
            <div class="form-group">
                <label>Time</label>
                <input type="time" step="1" name="time" value="${time}" />
            </div>
            <div class="form-group">
                <label>Location</label>
                <div class="input-with-btn">
                    <input type="text" name="eventLocation" placeholder="e.g. Paris, France" />
                    <input type="hidden" name="eventLat" />
                    <input type="hidden" name="eventLng" />
                    <input type="hidden" name="eventZoom" />
                    ${buildGeoButtons()}
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description"></textarea>
            </div>
        </form>
    `;

    const dialog = new Dialog({
        eventTitle: 'Insert Encounter',
        content,
        render: (html) => {
            activateDatePickers(html);

            const checkVisibility = (val) => {
                const show = (val === 'new' || val?.startsWith('switch'));
                html.find('#newOpNameGroup').toggle(show);
                dialog.setPosition({ height: 'auto' });
            };
            const sel = html.find('#orgInsertOpActionSelect');
            checkVisibility(sel.val());
            sel.on('change', (e) => checkVisibility(e.target.value));

            attachGeoButtonListeners(html);
        },
        buttons: {
            insert: {
                label: 'Insert',
                icon: '<i class="fas fa-plus"></i>',
                callback: async (html) => {
                    const formData  = new foundry.applications.ux.FormDataExtended(html.find('form')[0]).object;
                    const action    = html.find('select[name="opAction"]').val();
                    const newId     = foundry.utils.randomID();
                    const updates   = {};
                    const eventDate = normalizeDateInput(formData.date);
                    let phaseId = sourcePhaseId;
                    let opId    = sourceOpId;

                    // ── Operation routing ─────────────────────────────────────
                    if (action === 'new' || action?.startsWith('switch')) {
                        if (action.startsWith('switch')) {
                            const [, p, o] = action.split(':');
                            updates[`system.phases.${p}.operations.${o}.dateTo`] = eventDate;
                            phaseId = p;
                        }
                        if (!phaseId) {
                            phaseId = foundry.utils.randomID();
                            updates[`system.phases.${phaseId}`] = {
                                id: phaseId, name: 'Active Operations',
                                dateFrom: eventDate, operations: {},
                            };
                        }
                        opId = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}.operations.${opId}`] = {
                            id: opId, name: formData.newOpName || 'New Operation',
                            dateFrom: eventDate, dateTo: '', engagements: {},
                        };
                    } else if (action?.startsWith('continue')) {
                        const [, p, o] = action.split(':');
                        phaseId = p; opId = o;
                    }

                    // Last-resort containers if still unresolved
                    if (!phaseId || !opId) {
                        phaseId = foundry.utils.randomID();
                        opId    = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}`] = {
                            id: phaseId, name: 'Active Operations', dateFrom: eventDate,
                            operations: {
                                [opId]: { id: opId, name: 'Operations', dateFrom: eventDate, dateTo: '', engagements: {} }
                            },
                        };
                    }

                    updates[`system.phases.${phaseId}.operations.${opId}.engagements.${newId}`] = {
                        id: newId,
                        unitId:           track?.id || '',
                        name:             formData.name || 'New Engagement',
                        description:      formData.description || '',
                        date:             eventDate,
                        time:             formData.time || '00:00',
                        eventSpanFromLocation: formData.eventLocation || '',
                        eventSpanFromLat:      safeFloat(formData.eventLat),
                        eventSpanFromLng:      safeFloat(formData.eventLng),
                        eventSpanFromZoom:     safeFloat(formData.eventZoom),
                        linkedMandateIds: [],
                    };

                    await sheet.actor.update(updates);
                }
            },
            cancel: { label: 'Cancel' }
        },
        default: 'insert',
        close: () => { if (onClose) onClose(); },
    }, { classes: ['continuum-v2', 'dialog'] }).render(true);
}
