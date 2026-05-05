import { normalizeDateInput, timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { renderOrgGraph } from './org-render.js';
import { renderDatePicker } from '../span-graph-ui-helpers.js';
import { activateDatePickers } from '../date-picker.js';
import { panToLocation, getMapCenterLocation } from '../map-manager.js';
import { buildUnitOptions, safeFloat } from './org-dialog-helpers.js';

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
        const btn = $(e.currentTarget);
        const isGrab = btn.hasClass('grab-btn');
        const container = btn.closest('.input-with-btn');
        const input = container.find('input[name="eventLocation"]');
        const latIn = container.find('input[name="eventLat"]');
        const lngIn = container.find('input[name="eventLng"]');
        const zoomIn = container.find('input[name="eventZoom"]');

        btn.find('i').attr('class', 'fas fa-spinner fa-spin');
        const result = isGrab ? await getMapCenterLocation() : await panToLocation(input.val());
        btn.find('i').attr('class', isGrab ? 'fas fa-crosshairs' : 'fas fa-map-marker-alt');

        if (result) {
            latIn.val(result.lat); lngIn.val(result.lng); zoomIn.val(result.zoom || 12);
            if (result.formattedAddress) input.val(result.formattedAddress);
        }
    });
}

export function showLogEngagementDialog(viewState, graphData, sheet, svg) {
    viewState.interactionMode = 'dialog-open';
    const toDT = timestampToDateString(graphData.nowNode.time);

    const activeTrack = graphData.tracks[viewState.activeUnitId || 'hq'];
    const lastNode = activeTrack.nodes[activeTrack.nodes.length - 1];
    const sourcePhaseId = lastNode?.eraId || graphData.eras[graphData.eras.length - 1]?.id;
    const sourceOpId = lastNode?.expId;

    let optionsHtml = '';
    if (sourceOpId) {
        const op = sheet.actor.system.phases[sourcePhaseId]?.operations[sourceOpId];
        const isOpen = op && !op.dateTo;
        optionsHtml += `<optgroup label="Current Operation">`;
        optionsHtml += `<option value="continue:${sourcePhaseId}:${sourceOpId}" selected>Continue Op</option>`;
        if (isOpen) optionsHtml += `<option value="switch:${sourcePhaseId}:${sourceOpId}">Switch (Close Current & Start New)</option>`;
        optionsHtml += `</optgroup>`;
    }
    optionsHtml += `<option value="new">Start New Operation...</option>`;

    const unitOptions = buildUnitOptions(sheet);
    const dialogStyle = `<style>.continuum-dialog-form{display:flex;flex-direction:column;gap:10px}.input-with-btn{display:flex;align-items:center;width:100%;gap:5px}.input-with-btn input{flex:1}.geo-btn{flex:0 0 32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;background:#333;border:1px solid #555;color:#8ecae6;border-radius:4px;cursor:pointer}</style>`;

    const content = `
        <form class="continuum-dialog-form">
            ${dialogStyle}
            <div class="form-group"><label>Engagement Name</label><input type="text" name="name" value="New Engagement" autofocus/></div>
            <div class="form-group"><label>Context</label><select name="opAction" id="orgLogOpActionSelect">${optionsHtml}</select></div>
            <div class="form-group"><label>Assigned Unit</label><select name="unitId">${unitOptions}</select></div>
            <div class="form-group" id="newOpGroup" style="display:none;"><label>New Op Name</label><input type="text" name="newOpName" value="New Operation"/></div>
            ${renderDatePicker("date", toDT.date, "Date")}
            <div class="form-group"><label>Time</label><input type="time" name="time" step="1" value="${toDT.time}"/></div>
            <div class="form-group"><label>Location</label><div class="input-with-btn">
                <input type="text" name="eventLocation" placeholder="e.g. Paris"/>
                <input type="hidden" name="eventLat"/><input type="hidden" name="eventLng"/><input type="hidden" name="eventZoom"/>
                <button type="button" class="geo-btn locate-btn" eventTitle="Locate"><i class="fas fa-map-marker-alt"></i></button>
                <button type="button" class="geo-btn grab-btn" eventTitle="Grab Center"><i class="fas fa-crosshairs"></i></button>
            </div></div>
            <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
        </form>
    `;

    const dialog = new Dialog({
        eventTitle: "Log Engagement",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            const checkVisibility = (val) => {
                if (val === 'new' || (val && val.startsWith('switch'))) html.find('#newOpGroup').show();
                else html.find('#newOpGroup').hide();
                dialog.setPosition({ height: "auto" });
            };
            checkVisibility(html.find('#orgLogOpActionSelect').val());
            html.find('#orgLogOpActionSelect').on('change', (e) => checkVisibility(e.target.value));
            if (viewState.activeUnitId) html.find('select[name="unitId"]').val(viewState.activeUnitId);
            attachGeoButtonListeners(html);
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const action = html.find('select[name="opAction"]').val();
                    const newId = foundry.utils.randomID();
                    const updates = {};
                    let phaseId = sourcePhaseId;
                    let opId = sourceOpId;
                    const eventDate = normalizeDateInput(formData.date);

                    if (!phaseId) {
                        phaseId = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}`] = { id: phaseId, name: "Phase 1", dateFrom: eventDate, operations: {} };
                    }

                    if (action === 'new' || !opId || action.startsWith('switch')) {
                        if (action.startsWith('switch')) {
                            const [, p, o] = action.split(':');
                            updates[`system.phases.${p}.operations.${o}.dateTo`] = eventDate;
                            phaseId = p;
                        }
                        opId = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}.operations.${opId}`] = { id: opId, name: formData.newOpName || "New Operation", dateFrom: eventDate, dateTo: "", engagements: {} };
                    } else {
                        const [, p, o] = action.split(':');
                        phaseId = p; opId = o;
                    }

                    updates[`system.phases.${phaseId}.operations.${opId}.engagements.${newId}`] = {
                        id: newId, name: formData.name, description: formData.description,
                        date: eventDate, time: formData.time, unitId: formData.unitId,
                        eventSpanFromLocation: formData.eventLocation,
                        eventSpanFromLat: safeFloat(formData.eventLat), eventSpanFromLng: safeFloat(formData.eventLng), eventSpanFromZoom: safeFloat(formData.eventZoom)
                    };
                    await sheet.actor.update(updates);
                    sheet.render();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => {
            viewState.interactionMode = 'pan';
            renderOrgGraph(svg, viewState, graphData);
        }
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
