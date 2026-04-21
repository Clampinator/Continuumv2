import { submitNewRow, submitSimpleFieldEdit, pinLocationToMap } from './submit-spreadsheet-row.js';
import { saveEventPosition } from './save-event-position.js';
import { gatherNewRow, gatherExpandedRow, rowDataset, getActorEvent } from './gather-row-data.js';
import { importFromCsv } from './import-spreadsheet-csv.js';
import { downloadCsvTemplate } from './download-csv-template.js';
import { exportSpreadsheetCsv } from './export-spreadsheet-csv.js';
import { rebuildFromSpreadsheet } from './rebuild-from-spreadsheet.js';
import { Sound } from '../../sound-manager.js';
import { parseAgeString } from '../../span-graph-utils/provide-span-graph-utils.js';
import { ReferenceResolver } from '../services/reference-resolver.js';
import { normalizeLifelineAges } from '../services/chronology/normalize-lifeline-ages.js';
import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/modular/sortable.esm.js';

export function bindSpreadsheetListeners(app, html) {
    // SORT TOGGLE
    html.on('click', '.lss-sort-toggle', () => {
        app.sortNewestFirst = !app.sortNewestFirst;
        app.render(false);
    });

    // IMPORT / EXPORT
    html.on('click', '.lss-import-btn', () => importFromCsv(app));
    html.on('click', '.lss-export-btn', () => exportSpreadsheetCsv(app.actor));
    html.on('click', '.lss-template-btn', () => downloadCsvTemplate());

    // ROW EXPAND / COLLAPSE
    html.on('click', '.lss-expand-btn', (ev) => {
        const row = ev.currentTarget.closest('.lss-event-row');
        const expRow = row.nextElementSibling;
        const eventId = row.dataset.eventId;
        const nowVisible = expRow?.classList.toggle('hidden') === false;
        if (nowVisible) app._expandedRows.add(eventId);
        else app._expandedRows.delete(eventId);
        const icon = ev.currentTarget.querySelector('i');
        icon.classList.toggle('fa-chevron-down', !nowVisible);
        icon.classList.toggle('fa-chevron-up', nowVisible);
    });

    // NEW ROW - isSpan toggle reveals span fields and mirrors the date
    html.on('change', '.lss-n-is-span', (ev) => {
        html.find('.lss-new-span-fields').toggleClass('hidden', !ev.currentTarget.checked);
        if (ev.currentTarget.checked) {
            const d = html.find('.lss-n-date').val();
            if (d && !html.find('.lss-n-sf-date').val()) html.find('.lss-n-sf-date').val(d);
        }
    });

    // NEW ROW - experience option toggles
    html.on('change', '.lss-n-start-exp', (ev) => {
        html.find('.lss-new-exp-name-wrap').toggleClass('hidden', !ev.currentTarget.checked);
    });
    html.on('change', '.lss-n-end-exp', (ev) => {
        html.find('.lss-new-end-exp-wrap').toggleClass('hidden', !ev.currentTarget.checked);
    });
    html.on('change', '.lss-n-reopen-exp', (ev) => {
        html.find('.lss-new-reopen-wrap').toggleClass('hidden', !ev.currentTarget.checked);
    });

    // EXISTING ROW - expanded section toggles
    html.on('change', '.lss-is-span', (ev) => {
        ev.currentTarget.closest('.lss-expanded-row')
            ?.querySelector('.lss-span-fields-section')
            ?.classList.toggle('hidden', !ev.currentTarget.checked);
    });
    html.on('change', '.lss-start-exp', (ev) => {
        ev.currentTarget.closest('.lss-expanded-row')
            ?.querySelector('.lss-exp-name-wrap')
            ?.classList.toggle('hidden', !ev.currentTarget.checked);
    });
    html.on('change', '.lss-end-exp', (ev) => {
        ev.currentTarget.closest('.lss-expanded-row')
            ?.querySelector('.lss-end-exp-wrap')
            ?.classList.toggle('hidden', !ev.currentTarget.checked);
    });
    html.on('change', '.lss-reopen-exp', (ev) => {
        ev.currentTarget.closest('.lss-expanded-row')
            ?.querySelector('.lss-reopen-wrap')
            ?.classList.toggle('hidden', !ev.currentTarget.checked);
    });

    // ADD NEW ROW
    const _doAdd = async () => {
        const rowData = gatherNewRow(html);
        if (!rowData.date && !rowData.spanFromDate) {
            return void ui.notifications.warn("A date is required to add an event.");
        }
        if (!rowData.title) return void ui.notifications.warn("A title is required.");
        const ok = await submitNewRow(app.sheet, rowData);
        if (ok) {
            html.find('.lss-new-form')[0]?.reset();
            html.find('.lss-new-span-fields, .lss-new-exp-name-wrap, .lss-new-end-exp-wrap, .lss-new-reopen-wrap')
                .addClass('hidden');
        }
    };
    html.on('click', '.lss-add-btn', _doAdd);
    html.on('keydown', '.lss-new-form input', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); _doAdd(); }
    });

    // DELETE ROW
    html.on('click', '.lss-delete-btn', async (ev) => {
        ev.stopPropagation();
        const d = rowDataset(ev.currentTarget);
        if (!d) return;
        const ok = await Dialog.confirm({ title: "Delete Event", content: "<p>Delete this event from the lifeline?</p>" });
        if (!ok) return;
        const root = (d.expId && d.expId !== 'null')
            ? `system.eras.${d.eraId}.experiences.${d.expId}`
            : `system.eras.${d.eraId}`;
        await app.actor.update({ [`${root}.events.-=${d.eventId}`]: null });
        Sound.delete();
    });

    // Helper: save all location field values before async call
    function _saveAllLocationValues() {
        const values = {};
        // New row form
        const newLoc = html.find('.lss-n-location');
        if (newLoc.length) values['.lss-n-location'] = newLoc.val();
        // Existing rows
        html.find('.lss-field-location').each(function() {
            const row = this.closest('.lss-event-row');
            if (row && row.dataset.eventId) {
                values[`row-${row.dataset.eventId}`] = this.value;
            }
        });
        return values;
    }

    // Helper: restore all location field values after async call
    function _restoreAllLocationValues(values) {
        // New row form
        if (values['.lss-n-location']) {
            html.find('.lss-n-location').val(values['.lss-n-location']);
        }
        // Existing rows
        for (const [key, val] of Object.entries(values)) {
            if (key.startsWith('row-')) {
                const eventId = key.slice(4);
                const row = html.find(`.lss-event-row[data-event-id="${eventId}"]`)[0];
                const input = row?.querySelector('.lss-field-location');
                if (input) input.value = val;
            }
        }
    }

    // MAP PIN BUTTON - new row form
    html.on('click', '.lss-new-form .lss-map-pin-btn', async (ev) => {
        ev.stopPropagation();
        const btn = $(ev.currentTarget);
        const locationInput = html.find('.lss-n-location');
        const locationVal = locationInput.val().trim();
        console.log(`[LSS] Pin button pressed in NEW ROW form. Location value: "${locationVal}"`);
        if (!locationVal) return void ui.notifications.warn("Enter a location first.");
        
        btn.find('i').attr('class', 'fas fa-spinner fa-spin');
        console.log(`[LSS] Searching for location: "${locationVal}"`);
        const { panToLocation } = await import('../../map-manager.js');
        const result = await panToLocation(locationVal);
        btn.find('i').attr('class', 'fas fa-map-marker-alt');
        
        if (result && result.formattedAddress) {
            console.log(`[LSS] Location search SUCCESS. Found: "${result.formattedAddress}" at (${result.lat}, ${result.lng})`);
            html.find('.lss-n-location').val(result.formattedAddress);
            console.log(`[LSS] Updated new row location field with: "${result.formattedAddress}"`);
        } else {
            console.log(`[LSS] Location search FAILED for: "${locationVal}"`);
        }
    });

    // MAP PIN BUTTON - existing row
    html.on('click', '.lss-row-map-pin-btn', async (ev) => {
        ev.stopPropagation();
        const btn = $(ev.currentTarget);
        const d = rowDataset(ev.currentTarget);
        if (!d) return;
        const row = ev.currentTarget.closest('.lss-event-row');
        const locationInput = row?.querySelector('.lss-field-location');
        const locationVal = locationInput?.value?.trim();
        console.log(`[LSS] Pin button pressed in row eventId="${d.eventId}". Location value: "${locationVal}"`);
        if (!locationVal) return void ui.notifications.warn("Enter a location first.");
        
        const { eraId, expId, eventId } = d;

        // Use geocodeAddress instead of panToLocation - panToLocation triggers actor updates which cause re-renders
        btn.find('i').attr('class', 'fas fa-spinner fa-spin');
        console.log(`[LSS] Searching for location: "${locationVal}"`);
        const { geocodeAddress } = await import('../../map-manager.js');
        const result = await geocodeAddress(locationVal);
        btn.find('i').attr('class', 'fas fa-map-marker-alt');

        // Determine correct field names - span events use spanFrom* fields for the location column
        const isSpan = !!getActorEvent(app.actor, eraId, expId, eventId)?.isSpan;

        // Now do a SINGLE actor update with the final result
        if (result && result.formattedAddress) {
            console.log(`[LSS] Location search SUCCESS. Found: "${result.formattedAddress}" at (${result.lat}, ${result.lng})`);
            const updates = isSpan
                ? { spanFromLocation: result.formattedAddress, spanFromLat: result.lat, spanFromLng: result.lng, spanFromZoom: result.zoom || 12 }
                : { location: result.formattedAddress, lat: result.lat, lng: result.lng, zoom: result.zoom || 12 };
            await submitSimpleFieldEdit(app.actor, eraId, expId, eventId, updates);
            console.log(`[LSS] Updated row ${d.eventId} location in actor with: "${result.formattedAddress}"`);
        } else {
            console.log(`[LSS] Location search FAILED for: "${locationVal}"`);
            // Still save the original location name even if geocoding failed
            const updates = isSpan ? { spanFromLocation: locationVal } : { location: locationVal };
            await submitSimpleFieldEdit(app.actor, eraId, expId, eventId, updates);
        }
    });

    // ENTER KEY in location fields - pin to map
    html.on('keydown', '.lss-n-location', async (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            const locationVal = ev.currentTarget.value.trim();
            if (!locationVal) return void ui.notifications.warn("Enter a location first.");
            await pinLocationToMap(app.sheet, locationVal, null);
            ev.currentTarget.closest('.lss-map-pin-btn')?.classList.add('pinned');
        }
    });

    html.on('keydown', '.lss-field-location', async (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            const d = rowDataset(ev.currentTarget);
            if (!d) return;
            const locationVal = ev.currentTarget.value.trim();
            if (!locationVal) return void ui.notifications.warn("Enter a location first.");
            await pinLocationToMap(app.sheet, locationVal, d);
            ev.currentTarget.nextElementSibling?.classList.add('pinned');
        }
    });

    // SIMPLE FIELD BLUR SAVE (title, notes, location - no coordinate change)
    // For the location column: span events store departure location as spanFromLocation,
    // non-span events store it as location. Save to the field the template reads from.
    const _simpleFieldMap = { 'lss-field-title': 'title', 'lss-field-notes': 'notes', 'lss-field-location': 'location' };
    html.on('blur', '.lss-field-title, .lss-field-notes, .lss-field-location', async (ev) => {
        const d = rowDataset(ev.currentTarget);
        if (!d) return;
        const cls = Object.keys(_simpleFieldMap).find(k => ev.currentTarget.classList.contains(k));
        if (!cls) return;
        let fieldName = _simpleFieldMap[cls];
        if (fieldName === 'location') {
            const evt = getActorEvent(app.actor, d.eraId, d.expId, d.eventId);
            if (evt?.isSpan) fieldName = 'spanFromLocation';
        }
        const locValue = ev.currentTarget.value;
        await submitSimpleFieldEdit(app.actor, d.eraId, d.expId, d.eventId, { [fieldName]: locValue });
        // Geocode location fields so coordinates are saved and a map pin appears.
        if ((fieldName === 'location' || fieldName === 'spanFromLocation') && locValue.trim()) {
            const { geocodeAddress } = await import('../../map-manager.js');
            const geoResult = await geocodeAddress(locValue.trim());
            if (geoResult?.lat) {
                const coordUpdates = fieldName === 'spanFromLocation'
                    ? { spanFromLat: geoResult.lat, spanFromLng: geoResult.lng, spanFromZoom: geoResult.zoom || 12 }
                    : { lat: geoResult.lat, lng: geoResult.lng, zoom: geoResult.zoom || 12 };
                await submitSimpleFieldEdit(app.actor, d.eraId, d.expId, d.eventId, coordUpdates);
            }
        }
    });

    // DATE/TIME BLUR SAVE
    // Non-span events: direct position update (no rebuild).
    // Span events: full rebuild required because departure-date changes shift the rail.
    html.on('blur', '.lss-field-date, .lss-field-time', async (ev) => {
        if (app._suppressRebuild) return;
        const d = rowDataset(ev.currentTarget);
        if (!d) return;
        const row = ev.currentTarget.closest('.lss-event-row');
        const rawEvent = getActorEvent(app.actor, d.eraId, d.expId, d.eventId);
        if (!rawEvent) return;

        const newDate = row.querySelector('.lss-field-date')?.value;
        const newTime = row.querySelector('.lss-field-time')?.value;

        const handled = await saveEventPosition(app.actor, d.eraId, d.expId, d.eventId, {
            date: newDate, time: newTime,
        });

        if (!handled) {
            // Span or isBirth event - fall back to full rebuild.
            // For spans: the date column shows spanFromDate, so edits must set spanFromDate.
            const domLocation = row.querySelector('.lss-field-location')?.value;
            const edits = {
                date: newDate, time: newTime,
                title: row.querySelector('.lss-field-title')?.value,
                notes: row.querySelector('.lss-field-notes')?.value,
                ...(rawEvent.isSpan
                    ? { spanFromDate: newDate, spanFromTime: newTime, spanFromLocation: domLocation }
                    : { location: domLocation }),
            };
            await rebuildFromSpreadsheet(app.sheet, d.eventId, edits);
        }
    });

    // AGE BLUR SAVE - converts a typed age string to an absolute date and saves position.
    // Non-span events: direct position update (no rebuild).
    // Span events: full rebuild required.
    html.on('blur', '.lss-field-age', async (ev) => {
        if (app._suppressRebuild) return;
        const d = rowDataset(ev.currentTarget);
        if (!d) return;
        const val = ev.currentTarget.value.trim();
        if (!val) return;

        const dobTs = ReferenceResolver.resolveOrigin(app.actor);
        if (!dobTs) return;
        const ageSeconds = parseAgeString(val);
        if (!ageSeconds) return;

        const newTs   = dobTs + ageSeconds * 1000;
        const dateStr = new Date(newTs).toISOString().split('T')[0];
        const timeStr = new Date(newTs).toISOString().split('T')[1].slice(0, 8);

        const rawEvent = getActorEvent(app.actor, d.eraId, d.expId, d.eventId);
        if (!rawEvent) return;

        const handled = await saveEventPosition(app.actor, d.eraId, d.expId, d.eventId, {
            date: dateStr, time: timeStr, age: ageSeconds,
        });

        if (!handled) {
            // Span or isBirth event - fall back to full rebuild.
            const row = ev.currentTarget.closest('.lss-event-row');
            const domLocation = row?.querySelector('.lss-field-location')?.value;
            const edits = {
                date: dateStr, time: timeStr,
                title: row?.querySelector('.lss-field-title')?.value,
                notes: row?.querySelector('.lss-field-notes')?.value,
                ...(rawEvent.isSpan
                    ? { spanFromDate: dateStr, spanFromTime: timeStr, spanFromLocation: domLocation }
                    : { location: domLocation }),
            };
            await rebuildFromSpreadsheet(app.sheet, d.eventId, edits);
        }
    });

    // SAVE EXPANDED SECTION
    // Only rebuilds the lifeline when structure-affecting fields changed.
    // Pure content edits (title, notes, location) use a direct actor.update() instead.
    html.on('click', '.lss-save-row-btn', async (ev) => {
        const d = rowDataset(ev.currentTarget);
        if (!d) return;
        const row = html.find(`.lss-event-row[data-event-id="${d.eventId}"]`)[0];
        const rawEvent = getActorEvent(app.actor, d.eraId, d.expId, d.eventId);
        if (!rawEvent || !row) return;
        const existing = { ...rawEvent, eventId: d.eventId, eraId: d.eraId, expId: d.expId || null };
        const edits = gatherExpandedRow(row, existing);

        // Detect structural changes: position (date/time/span dates), type (isSpan),
        // or experience membership. Content changes (title/notes/location) are not structural.
        const actionParts  = (edits.experienceAction || '').split(':');
        const actionAgeId  = actionParts[1] || '';
        const actionExpId  = actionParts[2] || '';
        const curExpId     = (!d.expId || d.expId === 'null') ? '' : d.expId;
        const expMoved     = edits.experienceAction
            ? (actionAgeId !== d.eraId || actionExpId !== curExpId)
            : false;

        const isStructural = (
            edits.date          !== (rawEvent.date          || '') ||
            edits.time          !== (rawEvent.time          || '') ||
            !!edits.isSpan      !== !!rawEvent.isSpan              ||
            edits.spanFromDate  !== (rawEvent.spanFromDate  || '') ||
            edits.spanFromTime  !== (rawEvent.spanFromTime  || '') ||
            edits.spanToDate    !== (rawEvent.spanToDate    || '') ||
            edits.spanToTime    !== (rawEvent.spanToTime    || '') ||
            !!edits.startNewExp || !!edits.closeExperiences || !!edits.reopenExperiences ||
            expMoved
        );

        if (!isStructural) {
            // Content-only: one direct update, no rebuild.
            const isSpan = !!rawEvent.isSpan;
            const contentFields = { title: edits.title, notes: edits.notes };
            if (isSpan) {
                contentFields.spanFromLocation = edits.spanFromLocation || edits.location || '';
                contentFields.spanToLocation   = edits.spanToLocation || '';
            } else {
                contentFields.location = edits.location || '';
            }
            await submitSimpleFieldEdit(app.actor, d.eraId, d.expId, d.eventId, contentFields);
        } else {
            await rebuildFromSpreadsheet(app.sheet, d.eventId, edits);
        }
    });

// POST-RENDER: Set experience dropdown to the experience this event belongs to
    html.find('.lss-event-row').each(function() {
        const { expId, eraId } = this.dataset;
        const expRow = this.nextElementSibling;
        const ageSel = expRow?.querySelector('.lss-age-select');
        if (ageSel && eraId) {
            for (const opt of ageSel.options) {
                if (opt.value === eraId) { opt.selected = true; break; }
            }
        }
        if (!expId || expId === 'null') return;
        const expSel = expRow?.querySelector('.lss-exp-select');
        if (!expSel) return;
        const target = `${eraId}:${expId}`;
        for (const opt of expSel.options) {
            if (opt.value === target) { opt.selected = true; break; }
        }
    });

    // DRAG-AND-DROP REORDER
    const tbody = html.find('tbody')[0];
    if (tbody) {
        new Sortable(tbody, {
            animation: 150,
            handle: '.lss-drag-handle',
            draggable: '.lss-event-row',
            filter: '.lss-new-row-tr, .lss-expanded-row, tr[style]',
            preventOnFilter: false,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onStart: () => {
                html.find('.lss-expanded-row').addClass('hidden');
                html.find('.lss-expand-btn i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
            },
            onEnd: async (evt) => {
                if (evt.oldIndex === evt.newIndex) return;

                const movedRow = evt.item;
                const movedExpanded = movedRow.nextElementSibling;
                if (movedExpanded && movedExpanded.classList.contains('lss-expanded-row')) {
                    movedRow.parentNode.insertBefore(movedExpanded, movedRow.nextSibling);
                }

                const rows = html.find('.lss-event-row').toArray();
                const updates = {};

                // Write sort values in DOM order so same-age events respect drag position.
                // Phase 2 replaced createdAt-based ordering with age -> ts -> sort ordering.
                // createdAt is no longer a sort key; sort is the correct tiebreaker to write.
                for (let i = 0; i < rows.length; i++) {
                    const { eventId, eraId, expId } = rows[i].dataset;
                    if (!eventId) continue;
                    const root = (expId && expId !== 'null')
                        ? `system.eras.${eraId}.experiences.${expId}.events.${eventId}`
                        : `system.eras.${eraId}.events.${eventId}`;
                    updates[`${root}.sort`] = (i + 1) * 1000;
                }

                await app.actor.update(updates);
                // Recompute ages after the sort change - the new sequence order
                // may shift which spans apply to which downstream events.
                const { updates: ageUpdates } = normalizeLifelineAges(app.actor);
                if (Object.keys(ageUpdates).length) await app.actor.update(ageUpdates);
            }
        });
    }
}
