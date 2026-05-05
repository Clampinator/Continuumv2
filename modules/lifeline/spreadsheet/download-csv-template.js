/*
CSV column names accepted by the importer. Order does not matter - matched by name.
Required for events: eventTitle AND (date OR eventSpanFromDate).

The CSV format supports three sections:
  1. @era section (optional): structural era definitions
  2. @experience section (optional): experience containers
  3. Event rows: standard event columns

Sections are separated by blank lines. Lines starting with @ are
metadata headers. Old importers ignore them (no eventTitle match).
*/
export const TEMPLATE_HEADERS = [
    'type', 'date', 'time', 'eventTitle', 'eventNotes', 'location',
    'eventIsSpan', 'eventIsRest',
    'eventSpanFromDate', 'eventSpanFromTime', 'eventSpanFromLocation',
    'eventSpanToDate', 'eventSpanToTime', 'eventSpanToLocation',
    'experience', 'startExperience', 'endExperience',
    'era', 'subjectiveAge',
];

// Era section column order: id, name, age (seconds), dateFrom, dateTo, sort
// Exported as @era header line before era data rows.
export const ERA_TEMPLATE_HEADER = '@era,id,name,age,dateFrom,dateTo,sort';

// Experience section column order: id, name, eraId, dateTo, isOngoing, sort
// Exported as @experience header line before experience data rows.
export const EXPERIENCE_TEMPLATE_HEADER = '@experience,id,name,eraId,dateFrom,dateTo,isOngoing,sort';

export function downloadCsvTemplate() {
    const escape = (v) =>
        (String(v).includes(',') || String(v).includes('"') || String(v).includes('\n'))
            ? `"${String(v).replace(/"/g, '""')}"` : String(v);

    const lines = [];

    // ERA SECTION EXAMPLE
    lines.push(ERA_TEMPLATE_HEADER);
    lines.push(['era_example1', 'Childhood', '0', '1985-01-01', '2003-09-01', '1000'].map(escape).join(','));
    lines.push(['era_example2', 'Adulthood', '568080000', '2003-09-01', '', '2000'].map(escape).join(','));
    lines.push('');

    // EXPERIENCE SECTION EXAMPLE
    lines.push(EXPERIENCE_TEMPLATE_HEADER);
    lines.push(['exp_example1', 'College Years', 'era_example2', '1985-09-01', '1989-05-20', 'false', '1000'].map(escape).join(','));
    lines.push('');

    // EVENT ROWS
    lines.push(TEMPLATE_HEADERS.join(','));

    const TEMPLATE_EXAMPLE_ROWS = [
        // A level event opening a new experience
        ['event', '1985-06-12', '09:00', 'First Day of College', 'Moved into the dorms.', 'State University',
         '', '', '', '', '', '', '', '',
         'College Years', 'true', '', 'Childhood', ''],
        // A level event closing an experience
        ['event', '1989-05-20', '', 'Graduation Day', 'Finally done.', 'State University',
         '', '', '', '', '', '', '', '',
         'College Years', '', 'true', 'Childhood', ''],
        // A span event (time traveler jumping to the future)
        ['event', '2040-03-15', '12:00', 'Arrival in 2040', 'Saw the future.', 'Paris',
         'true', '', '2040-03-15', '12:00', '', '2060-01-01', '12:00', '',
         '', '', '', ''],
    ];

    for (const row of TEMPLATE_EXAMPLE_ROWS) {
        lines.push(row.map(escape).join(','));
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'lifeline-template.csv';
    a.click();
    URL.revokeObjectURL(url);
}