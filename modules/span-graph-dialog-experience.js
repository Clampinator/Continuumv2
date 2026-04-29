// continuum/modules/span-graph-dialog-experience.js
import { renderDatePicker } from './span-graph-ui-helpers.js';
import { activateDatePickers } from './date-picker.js';
import { normalizeDateInput, getAgeStringFromDate, parseAgeString, convertTimestampToDateString } from './span-graph-utils/provide-span-graph-utils.js';
import { Sound } from './sound-manager.js';

/**
 * Builds a read-only event list for all events in and related to
 * the experience. Shows event title, date, and span status.
 *
 * Includes:
 * - Events inside the experience (exp.events)
 * - Era-level closing event (endsExpId or isExpEnd matching this experience)
 *
 * @param {Object} exp - The experience data (with id and events)
 * @param {string} eraId - The era ID
 * @param {Object} actor - The Foundry actor (for scanning era events)
 * @returns {string} HTML string for the event list
 */
function buildEventList(exp, eraId, actor) {
    const expId = exp.id;
    const rows = [];

    // EXPERIENCE-LEVEL EVENTS: Events inside the experience.
    // These carry startsExpId and are directly owned by the experience.
    const expEvents = Object.entries(exp.events || {});
    expEvents.forEach(([id, evt]) => {
        rows.push({
            sort: Number(evt.sort) || 0,
            id,
            title: evt.eventTitle || 'Untitled',
            date: evt.eventDate || '---',
            time: evt.eventTime || '',
            isSpan: !!evt.eventIsSpan,
            isOpener: !!(evt.startsExpId || evt.isExpStart || evt._isExpStart),
            isCloser: !!(evt.isExpEnd || evt._isExpEnd),
            source: 'exp'
        });
    });

    // ERA-LEVEL CLOSING EVENT: When an experience is closed, the closing
    // event is ejected to era-level but stamped with endsExpId pointing
    // back to the experience it closed. This is the primary link.
    // Fallback: isExpEnd flag (from NPC-generated data).
    // Legacy fallback: date-match (event timestamp matches exp.dateTo).
    const era = actor?.system?.eras?.[eraId];
    if (era && expId) {
        const eraEvents = Object.entries(era.events || {});
        const expDateTo = (exp.dateTo || '').trim();
        eraEvents.forEach(([id, evt]) => {
            const closesThisExp = evt.endsExpId === expId;
            const isCloserForAny = evt.isExpEnd || evt._isExpEnd;
            // Legacy date-match: event's combined date+time matches exp.dateTo
            const levelDT = `${evt.eventDate || ''} ${(evt.eventTime || '').trim()}`.trim();
            const spanDT = `${evt.eventSpanFromDate || ''} ${evt.eventSpanFromTime || ''}`.trim();
            const matchesDateTo = expDateTo && (levelDT === expDateTo || spanDT === expDateTo);
            if (closesThisExp || isCloserForAny || matchesDateTo) {
                rows.push({
                    sort: Number(evt.sort) || 0,
                    id,
                    title: evt.eventTitle || 'Untitled',
                    date: evt.eventDate || '---',
                    time: evt.eventTime || '',
                    isSpan: !!evt.eventIsSpan,
                    isOpener: false,
                    isCloser: true,
                    source: 'era'
                });
            }
        });
    }

    if (rows.length === 0) {
        return '<p style="color: #888; font-style: italic; font-size: 0.85em; margin: 4px 0;">No events in this experience yet.</p>';
    }

    // Sort by narrative order
    rows.sort((a, b) => a.sort - b.sort);

    let html = '<div class="exp-event-list" style="max-height: 200px; overflow-y: auto; background: #111; border: 1px solid #333; border-radius: 4px; padding: 4px;">';

    rows.forEach(row => {
        const icon = row.isSpan
            ? '<i class="fas fa-arrows-alt-v" style="color: #ff00ff; width: 16px;"></i>'
            : '<i class="fas fa-circle" style="color: #00e5ff; font-size: 0.6em; width: 16px; text-align: center;"></i>';
        const title = row.title;
        const dateStr = row.date;
        const timeStr = row.time;
        const openerTag = row.isOpener ? ' <span style="color: #28a745; font-size: 0.8em;">[Opens]</span>' : '';
        const closerTag = row.isCloser ? ' <span style="color: #ff6b6b; font-size: 0.8em;">[Closes]</span>' : '';
        const eraTag = row.source === 'era' ? ' <span style="color: #888; font-size: 0.7em;">[Era]</span>' : '';

        html += `<div style="display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-bottom: 1px solid #222; font-size: 0.85em;">
            ${icon}
            <span style="color: #eee; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}${openerTag}${closerTag}${eraTag}</span>
            <span style="color: #888; font-size: 0.8em; white-space: nowrap;">${dateStr} ${timeStr}</span>
        </div>`;
    });

    html += '</div>';
    return html;
}

/**
 * Opens the Experience Edit Dialog for editing an experience's name,
 * description, dates, and viewing its associated events.
 *
 * @param {Object} data - Experience data: { id, eraId, name, description, dateFrom, dateTo, isOngoing, events }
 * @param {ActorSheet} sheet - The actor sheet instance
 * @param {Object} viewState - The viewport's view state (for resetting interaction mode)
 * @param {Function} [onClose] - Callback invoked when the dialog closes (resets isPending)
 */
export function openExperienceEditDialog(data, sheet, viewState, onClose) {
    const dobStr = sheet.actor.system.personal.dob;
    const dobTs = dobStr ? new Date(dobStr + "T00:00:00").getTime() : Date.now();
    const startAgeStr = getAgeStringFromDate(data.dateFrom, dobTs);
    const endAgeStr = getAgeStringFromDate(data.dateTo, dobTs);

    // Build the event list, including era-level closing events
    const eventListHtml = buildEventList(data, data.eraId, sheet.actor);

    const content = `
        <form class="continuum-dialog-form experience-edit-dialog" autocomplete="off">
            <style>
                .ongoing-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 5px; background: rgba(74, 144, 226, 0.1); border-radius: 4px; border: 1px dashed rgba(74, 144, 226, 0.3); }
                .ongoing-row input { width: 20px; height: 20px; cursor: pointer; }
                .ongoing-row label { color: #4a90e2; font-weight: bold; cursor: pointer; flex: 1; }
                .exp-section-header { font-size: 0.75em; font-weight: bold; color: #ff00ff; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,0,255,0.2); padding-bottom: 2px; margin-bottom: 5px; margin-top: 10px; }
            </style>
            <div class="form-group"><label>Name</label><input type="text" name="name" value="${data.name}" autofocus/></div>
            
            <div class="ongoing-row">
                <input type="checkbox" name="isOngoing" id="edit-exp-ongoing" ${data.isOngoing ? 'checked' : ''} />
                <label for="edit-exp-ongoing">Ongoing (Active Maintenance)</label>
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 3px; margin-bottom: 5px;">
                <label>Description</label>
                <textarea name="description" style="width: 100%; min-height: 80px; resize: vertical;">${data.description || ''}</textarea>
            </div>
            
            <div class="form-group" style="margin-top: 10px; border-top: 1px solid #444; padding-top: 5px;">
                <label style="color: #aaa; font-size: 0.8em;">Timeline Reference</label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    ${renderDatePicker("dateFrom", data.dateFrom, "Start Date")}
                </div>
                <div style="flex: 1;">
                    <div class="form-group">
                        <label>Start Age</label>
                        <input type="text" name="startAge" value="${startAgeStr}" placeholder="e.g. 17y 2m"/>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    ${renderDatePicker("dateTo", data.dateTo, "End Date")}
                </div>
                <div style="flex: 1;">
                    <div class="form-group">
                        <label>End Age</label>
                        <input type="text" name="endAge" value="${endAgeStr}" placeholder="e.g. 23y"/>
                    </div>
                </div>
            </div>

            <div class="exp-section-header">Events in this Experience</div>
            ${eventListHtml}
        </form>
    `;

    new Dialog({
        eventTitle: "Edit Experience",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text']").on("focus", event => event.currentTarget.select());

            const ongoingCheck = html.find('input[name="isOngoing"]');
            const dateToInput = html.find('input[name="dateTo"]');

            // Logic: If user picks an end date, turn off ongoing
            dateToInput.on('change', (e) => {
                if (e.target.value.trim() !== "") {
                    ongoingCheck.prop('checked', false);
                }
            });

            // Logic: If user checks ongoing, clear end date
            ongoingCheck.on('change', (e) => {
                if (e.target.checked) {
                    dateToInput.val('').trigger('change');
                }
            });
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const updates = {};
                    const prefix = `system.eras.${data.eraId}.experiences.${data.id}`;
                    
                    updates[`${prefix}.name`] = formData.name;
                    updates[`${prefix}.description`] = formData.description;
                    updates[`${prefix}.isOngoing`] = !!formData.isOngoing;
                    
                    // Sync Subjective Age strings to Dates if they were edited
                    if (formData.startAge && formData.startAge !== startAgeStr) {
                        const startSec = parseAgeString(formData.startAge);
                        const startDate = new Date(dobTs + (startSec * 1000));
                        updates[`${prefix}.dateFrom`] = startDate.toISOString().split('T')[0];
                    } else {
                        updates[`${prefix}.dateFrom`] = normalizeDateInput(formData.dateFrom);
                    }

                    if (formData.endAge && formData.endAge !== endAgeStr) {
                        const endSec = parseAgeString(formData.endAge);
                        const endDate = new Date(dobTs + (endSec * 1000));
                        updates[`${prefix}.dateTo`] = endDate.toISOString().split('T')[0];
                    } else {
                        updates[`${prefix}.dateTo`] = normalizeDateInput(formData.dateTo);
                    }
                    
                    await sheet.actor.update(updates);
                    Sound.confirm();
                }
            },
            delete: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.eras.${data.eraId}.experiences.-=${data.id}`]: null });
                    Sound.delete();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => {
            // Reset interaction state so the dialog can be opened again
            viewState.interactionMode = 'pan';
            if (onClose) onClose();
        }
    }, { classes: ["continuum-v2", "dialog"], width: 480 }).render(true);
}