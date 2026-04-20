// Reads all inputs from the new-row form and returns a plain values object.
export function gatherNewRow(html) {
    const f = html.find('.lss-new-form');
    const expSelectVal = f.find('.lss-n-exp-select').val();
    return {
        date:              f.find('.lss-n-date').val().trim(),
        time:              f.find('.lss-n-time').val().trim(),
        title:             f.find('.lss-n-title').val().trim(),
        notes:             f.find('.lss-n-notes').val().trim(),
        location:          f.find('.lss-n-location').val().trim(),
        isSpan:            f.find('.lss-n-is-span').prop('checked'),
        spanFromDate:      f.find('.lss-n-sf-date').val().trim(),
        spanFromTime:      f.find('.lss-n-sf-time').val().trim(),
        spanFromLocation:  f.find('.lss-n-sf-loc').val().trim(),
        spanToDate:        f.find('.lss-n-st-date').val().trim(),
        spanToTime:        f.find('.lss-n-st-time').val().trim(),
        spanToLocation:    f.find('.lss-n-st-loc').val().trim(),
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
        title:             r.find('.lss-field-title').val() ?? baseData.title,
        notes:             r.find('.lss-field-notes').val() ?? baseData.notes,
        location:          r.find('.lss-field-location').val() ?? baseData.location,
        date:              r.find('.lss-field-date').val() ?? baseData.date,
        time:              r.find('.lss-field-time').val() ?? baseData.time,
        isSpan:            expEl.find('.lss-is-span').prop('checked'),
        spanFromDate:      expEl.find('.lss-sf-date').val(),
        spanFromTime:      expEl.find('.lss-sf-time').val(),
        spanFromLocation:  expEl.find('.lss-sf-loc').val(),
        spanToDate:        expEl.find('.lss-st-date').val(),
        spanToTime:        expEl.find('.lss-st-time').val(),
        spanToLocation:    expEl.find('.lss-st-loc').val(),
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
