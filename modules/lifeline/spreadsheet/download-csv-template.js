/*
CSV column names accepted by the importer. Order does not matter - matched by name.
Required for events: title AND (date OR spanFromDate).
*/
export const TEMPLATE_HEADERS = [
    'type',
    'date', 'time', 'title', 'notes', 'location',
    'isSpan',
    'spanFromDate', 'spanFromTime', 'spanFromLocation',
    'spanToDate',   'spanToTime',   'spanToLocation',
    'experience', 'startExperience', 'endExperience',
    'age', 'isBirth',
    'subjectiveAge',
];

/*
Example rows shown in the downloaded template.
Age rows come first; event rows follow and reference the age by name.
*/
const TEMPLATE_EXAMPLE_ROWS = [
    // type=age rows create Age containers - no date needed, just a title
    ['age', '', '', 'College Years', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    // type=event (or blank) rows are lifeline events
    // experience=name, startExperience=true opens an Experience; age=name routes to that Age
    ['event', '1985-06-12', '09:00', 'First Day of College', 'Moved into the dorms.', 'State University',
     '', '', '', '', '', '', '', 'College Years', 'true', '', 'College Years'],
    ['event', '1989-05-20', '', 'Graduation Day', 'Finally done.', 'State University',
     '', '', '', '', '', '', '', 'College Years', '', 'true', 'College Years'],
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
