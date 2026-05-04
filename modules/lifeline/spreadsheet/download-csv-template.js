/*
CSV column names accepted by the importer. Order does not matter - matched by name.
Required for events: eventTitle AND (date OR eventSpanFromDate).
*/
export const TEMPLATE_HEADERS = [
    'date', 'time', 'eventTitle', 'eventNotes', 'location',
    'eventIsSpan', 'eventIsRest',
    'eventSpanFromDate', 'eventSpanFromTime', 'eventSpanFromLocation',
    'eventSpanToDate', 'eventSpanToTime', 'eventSpanToLocation',
    'experience', 'startExperience', 'endExperience',
    'subjectiveAge',
];

/*
Example rows shown in the downloaded template.
Each row maps to the TEMPLATE_HEADERS columns in order.
*/
const TEMPLATE_EXAMPLE_ROWS = [
    // A level event opening a new experience
    ['1985-06-12', '09:00', 'First Day of College', 'Moved into the dorms.', 'State University',
     '', '', '', '', '', '', '',
     'College Years', 'true', '', ''],
    // A level event closing an experience
    ['1989-05-20', '', 'Graduation Day', 'Finally done.', 'State University',
     '', '', '', '', '', '', '',
     'College Years', '', 'true', ''],
    // A span event (time traveler jumping to the future)
    ['2040-03-15', '12:00', 'Arrival in 2040', 'Saw the future.', 'Paris',
     'true', '', '2040-03-15', '12:00', '', '2060-01-01', '12:00', '',
     '', '', '', ''],
];

export function downloadCsvTemplate() {
    const escape = (v) =>
        (String(v).includes(',') || String(v).includes('"') || String(v).includes('\n'))
            ? `"${String(v).replace(/"/g, '""')}"` : String(v);

    const lines = [
        TEMPLATE_HEADERS.join(','),
        ...TEMPLATE_EXAMPLE_ROWS.map(row => row.map(escape).join(',')),
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'lifeline-template.csv';
    a.click();
    URL.revokeObjectURL(url);
}
