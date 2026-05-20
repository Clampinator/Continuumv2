// Reads all inputs from the new-row form and returns a plain values object.
export function gatherNewRow(html) {
    const f = html.find('.lss-new-form');
    const expSelectVal = f.find('.lss-n-exp-select').val();
    return {
        date:              f.find('.lss-n-date').val().trim(),
        time:              f.find('.lss-n-time').val().trim(),
        eventTitle:             f.find('.lss-n-eventTitle').val().trim(),
        eventNotes:             f.find('.lss-n-eventNotes').val().trim(),
        location:          f.find('.lss-n-location').val().trim(),
        eventIsSpan:            f.find('.lss-n-is-span').prop('checked'),
        eventSpanFromDate:      f.find('.lss-n-sf-date').val().trim(),
        eventSpanFromTime:      f.find('.lss-n-sf-time').val().trim(),
        eventSpanFromLocation:  f.find('.lss-n-sf-loc').val().trim(),
        eventSpanToDate:        f.find('.lss-n-st-date').val().trim(),
        eventSpanToTime:        f.find('.lss-n-st-time').val().trim(),
        eventSpanToLocation:    f.find('.lss-n-st-loc').val().trim(),
        startNewExp:       f.find('.lss-n-start-exp').prop('checked'),
        newExpName:        f.find('.lss-n-exp-name').val().trim(),
        experienceAction:  expSelectVal ? `move:${expSelectVal}` : '',
        closeExperiences:  f.find('.lss-n-end-exp-which').val() || '',
        reopenExperiences: f.find('.lss-n-reopen-which').val() || '',
    };
}

// Reads fields from an existing row and its adjacent expanded row.
export function gatherExpandedRow(rowEl, baseData) {
    const r = $(rowEl);
    const expEl = r.next('.lss-expanded-row');
    const expSelectVal = expEl.find('.lss-exp-select').val();
    const eraSelectVal = expEl.find('.lss-era-select').val();
    // Experience takes priority; fall back to era-level move if only era is selected.
    const experienceAction = expSelectVal ? `move:${expSelectVal}`
        : eraSelectVal ? `move:${eraSelectVal}:` : '';
    return {
        eventTitle:             r.find('.lss-field-eventTitle').val() ?? baseData.eventTitle,
        eventNotes:             r.find('.lss-field-eventNotes').val() ?? baseData.eventNotes,
        location:          r.find('.lss-field-location').val() ?? baseData.location,
        date:              r.find('.lss-field-date').val() ?? baseData.date,
        time:              r.find('.lss-field-time').val() ?? baseData.time,
        eventIsSpan:            expEl.find('.lss-is-span').prop('checked'),
        eventSpanFromDate:      expEl.find('.lss-sf-date').val(),
        eventSpanFromTime:      expEl.find('.lss-sf-time').val(),
        eventSpanFromLocation:  expEl.find('.lss-sf-loc').val(),
        eventSpanToDate:        expEl.find('.lss-st-date').val(),
        eventSpanToTime:        expEl.find('.lss-st-time').val(),
        eventSpanToLocation:    expEl.find('.lss-st-loc').val(),
        startNewExp:       expEl.find('.lss-start-exp').prop('checked'),
        newExpName:        expEl.find('.lss-exp-name-input').val(),
        experienceAction,
        closeExperiences:  expEl.find('.lss-end-exp-which').val() || '',
        reopenExperiences: expEl.find('.lss-reopen-which').val() || '',
    };
}

// Extracts row identity (eventId, eraId, expId) from a DOM element inside a row.
export function rowDataset(el) {
    const tr = $(el).closest('.lss-event-row, .lss-expanded-row')[0];
    return tr ? tr.dataset : null;
}

// Returns the raw actor event object for a row, or null if not found.
export function getActorEvent(actor, eraId, expId, eventId) {
    const era = actor.system.eras?.[eraId];
    if (!era) return null;
    return (expId && expId !== 'null')
        ? era.experiences?.[expId]?.events?.[eventId]
        : era.events?.[eventId];
}
