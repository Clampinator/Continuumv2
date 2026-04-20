/*
Low-level CSV parsing helpers used by the CSV importer.
*/

// Accepts exact tokens OR strings that begin with a truthy token (e.g. "True = some note").
export function parseBool(val) {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return ['true', 'yes', '1', 'x'].some(token =>
        v === token || v.startsWith(token + ' ') || v.startsWith(token + '=')
    );
}

// Converts DD/MM/YYYY to YYYY-MM-DD. All other formats pass through unchanged.
export function normalizeDate(val) {
    if (!val) return '';
    const ddmmyyyy = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
        const [, dd, mm, yyyy] = ddmmyyyy;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return val.trim();
}

/*
Minimal CSV parser. Handles quoted fields with embedded commas and newlines.
Returns array of row arrays.
*/
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch   = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') { field += '"'; i++; }
            else if (ch === '"')            { inQuotes = false; }
            else                            { field += ch; }
        } else {
            if      (ch === '"')                              { inQuotes = true; }
            else if (ch === ',')                             { row.push(field); field = ''; }
            else if (ch === '\r' && next === '\n')           { row.push(field); rows.push(row); row = []; field = ''; i++; }
            else if (ch === '\n' || ch === '\r')             { row.push(field); rows.push(row); row = []; field = ''; }
            else                                             { field += ch; }
        }
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
}
