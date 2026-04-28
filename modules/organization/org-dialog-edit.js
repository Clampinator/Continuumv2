import { normalizeDateInput } from '../span-graph-utils/provide-span-graph-utils.js';
import { renderOrgGraph } from './org-render.js';
import { renderDatePicker } from '../span-graph-ui-helpers.js';
import { activateDatePickers } from '../date-picker.js';
import { panToLocation, getMapCenterLocation } from '../map-manager.js';
import { buildUnitOptions, safeFloat } from './org-dialog-helpers.js';
import { getSheetContext } from '../graph-state.js';

export function openEditDialog(type, data, sheet) {
    if (type !== 'engagement') return;

    const { viewState, graphData } = getSheetContext(sheet);
    viewState.interactionMode = 'dialog-open';
    const svg = sheet.element.find('.span-graph-svg')[0];
    const unitOptions = buildUnitOptions(sheet);

    const dialogStyle = `<style>.input-with-btn{display:flex;align-items:center;width:100%;gap:5px}.input-with-btn input{flex:1}.geo-btn{flex:0 0 32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;background:#333;border:1px solid #555;color:#8ecae6;border-radius:4px;cursor:pointer}</style>`;

    const content = `
        <form>
            ${dialogStyle}
            <div class="form-group"><label>Name</label><input type="text" name="name" value="${data.name}" autofocus/></div>
            ${renderDatePicker("date", data.eventDate, "Established")}
            <div class="form-group"><label>Time</label><input type="time" name="time" step="1" value="${data.eventTime || ''}"/></div>
            <div class="form-group"><label>Assigned Unit</label><select name="unitId">${unitOptions}</select></div>
            <div class="form-group"><label>Location</label><div class="input-with-btn">
                <input type="text" name="eventLocation" value="${data.eventSpanFromLocation || ''}" placeholder="e.g. Paris"/>
                <input type="hidden" name="eventLat" value="${data.eventSpanFromLat || ''}"/>
                <input type="hidden" name="eventLng" value="${data.eventSpanFromLng || ''}"/>
                <input type="hidden" name="eventZoom" value="${data.eventSpanFromZoom || ''}"/>
                <button type="button" class="geo-btn locate-btn" eventTitle="Locate"><i class="fas fa-map-marker-alt"></i></button>
                <button type="button" class="geo-btn grab-btn" eventTitle="Grab Center"><i class="fas fa-crosshairs"></i></button>
            </div></div>
            ${renderDatePicker("dateTo", data.dateTo || '', "Departed (optional)")}
            <div class="form-group"><label>Departure Time</label><input type="time" name="timeTo" step="1" value="${data.timeTo || ''}"/></div>
            <div class="form-group"><label>Description</label><textarea name="description">${data.description}</textarea></div>
        </form>
    `;

    new Dialog({
        eventTitle: "Edit Engagement",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            if (data.unitId) html.find('select[name="unitId"]').val(data.unitId);

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
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const path = `system.phases.${data.phaseId}.operations.${data.opId}.engagements.${data.id}`;
                    await sheet.actor.update({
                        [`${path}.name`]: formData.name,
                        [`${path}.date`]: normalizeDateInput(formData.date),
                        [`${path}.time`]: formData.time,
                        [`${path}.description`]: formData.description,
                        [`${path}.unitId`]: formData.unitId,
                        [`${path}.eventSpanFromLocation`]: formData.eventLocation,
                        [`${path}.eventSpanFromLat`]: safeFloat(formData.eventLat),
                        [`${path}.eventSpanFromLng`]: safeFloat(formData.eventLng),
                        [`${path}.eventSpanFromZoom`]: safeFloat(formData.eventZoom),
                        [`${path}.dateTo`]: normalizeDateInput(formData.dateTo) || null,
                        [`${path}.timeTo`]: formData.timeTo || null,
                    });
                }
            },
            delete: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    const path = `system.phases.${data.phaseId}.operations.${data.opId}.engagements.-=${data.id}`;
                    await sheet.actor.update({ [path]: null });
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => {
            viewState.interactionMode = 'pan';
            if (svg) renderOrgGraph(svg, viewState, graphData);
        }
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
