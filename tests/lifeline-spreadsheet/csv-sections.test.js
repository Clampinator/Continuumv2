import { describe, it, expect } from 'vitest';

// Test the pure parsing functions extracted from import-spreadsheet-csv.js
// These don't require Foundry actor mocks.

// Re-implement the section extraction logic for testing.
// The actual functions are inside import-spreadsheet-csv.js as module-scoped
// functions, so we re-implement the pure logic here for unit testing.
// This follows the project's pattern of testing Kernel-level pure functions.

function _extractSections(allRows) {
    const eraRows = [];
    const experienceRows = [];
    const eventRows = [];
    let currentSection = 'events';

    for (const row of allRows) {
        const first = (row[0] ?? '').trim().toLowerCase();

        if (first === '@era') {
            currentSection = 'era';
            continue;
        }
        if (first === '@experience') {
            currentSection = 'experience';
            continue;
        }

        const isBlank = row.every(c => !(c ?? '').trim());
        if (isBlank) {
            currentSection = 'events';
            continue;
        }

        // 'type' is the first column of TEMPLATE_HEADERS and must be
        // detected here because parseCsv strips blank separator lines.
        if (first === 'type' || first === 'date' || first === 'eventtitle' || first === 'title') {
            currentSection = 'events';
        }

        if (currentSection === 'era') {
            eraRows.push(row);
        } else if (currentSection === 'experience') {
            experienceRows.push(row);
        } else {
            eventRows.push(row);
        }
    }

    return { eraRows, experienceRows, eventRows };
}

function _parseEraRows(eraRows) {
    const eras = [];
    for (const row of eraRows) {
        if (row.length < 3) continue;
        const origId = (row[0] ?? '').trim();
        if (origId.toLowerCase() === 'id') continue;
        eras.push({
            origId,
            name: (row[1] ?? '').trim() || 'Imported Era',
            age: Number(row[2]) || 0,
            dateFrom: (row[3] ?? '').trim(),
            dateTo: (row[4] ?? '').trim(),
            sort: Number(row[5]) || 0
        });
    }
    return eras;
}

function _parseExperienceRows(experienceRows) {
    const exps = [];
    for (const row of experienceRows) {
        if (row.length < 3) continue;
        const origId = (row[0] ?? '').trim();
        if (origId.toLowerCase() === 'id') continue;
        exps.push({
            origId,
            name: (row[1] ?? '').trim() || 'Imported Experience',
            origEraId: (row[2] ?? '').trim(),
            dateFrom: (row[3] ?? '').trim(),
            dateTo: (row[4] ?? '').trim(),
            isOngoing: (row[5] ?? '').trim().toLowerCase() === 'true',
            sort: Number(row[6]) || 0
        });
    }
    return exps;
}

describe('CSV Section Extraction', () => {
    it('should separate @era, @experience, and event sections', () => {
        const rows = [
            ['@era', 'id', 'name', 'age', 'dateFrom', 'dateTo', 'sort'],
            ['era1', 'Childhood', '0', '2000-01-01', '', '1000'],
            ['era2', 'Adulthood', '315360000', '2010-01-01', '', '2000'],
            [''],
            ['@experience', 'id', 'name', 'eraId', 'dateFrom', 'dateTo', 'isOngoing', 'sort'],
            ['exp1', 'School', 'era1', '2003-09-01', '2006-06-15', 'false', '1000'],
            [''],
            ['type', 'date', 'time', 'eventTitle'],
            ['event', '2000-06-15', '12:00', 'Birthday'],
        ];

        const { eraRows, experienceRows, eventRows } = _extractSections(rows);

        expect(eraRows).toHaveLength(2);
        expect(eraRows[0][0]).toBe('era1');
        expect(eraRows[1][0]).toBe('era2');

        expect(experienceRows).toHaveLength(1);
        expect(experienceRows[0][0]).toBe('exp1');

        // Event rows include the header + data
        expect(eventRows).toHaveLength(2);
        expect(eventRows[0][0]).toBe('type');
        expect(eventRows[1][3]).toBe('Birthday');
    });

    it('should handle CSV with no @ sections (legacy format)', () => {
        const rows = [
            ['date', 'time', 'eventTitle', 'eventNotes'],
            ['2000-06-15', '12:00', 'Birthday', 'A party'],
            ['2005-03-01', '09:00', 'First Day', 'School'],
        ];

        const { eraRows, experienceRows, eventRows } = _extractSections(rows);

        expect(eraRows).toHaveLength(0);
        expect(experienceRows).toHaveLength(0);
        expect(eventRows).toHaveLength(3);
    });

    it('should handle @era section with no @experience section', () => {
        const rows = [
            ['@era', 'id', 'name', 'age'],
            ['era1', 'Life', '0'],
            [''],
            ['date', 'time', 'eventTitle'],
            ['2000-01-01', '00:00', 'Birth'],
        ];

        const { eraRows, experienceRows, eventRows } = _extractSections(rows);

        expect(eraRows).toHaveLength(1);
        expect(experienceRows).toHaveLength(0);
        expect(eventRows).toHaveLength(2);
    });

    it('should treat blank lines as section reset to events', () => {
        const rows = [
            ['@era', 'id', 'name'],
            ['era1', 'Childhood'],
            [''],
            ['date', 'eventTitle'],
            ['2000-01-01', 'Birth'],
        ];

        const { eraRows, eventRows } = _extractSections(rows);

        expect(eraRows).toHaveLength(1);
        expect(eventRows).toHaveLength(2);
    });

    // REGRESSION: parseCsv strips blank separator lines between sections.
    // When no blank line separates @experience from event header starting
    // with 'type', all event rows were mis-routed to experienceRows.
    it('should route events to eventRows when "type" header follows @experience section with no blank line', () => {
        // This simulates what parseCsv produces from a real export:
        // blank lines are filtered out, so @experience transitions
        // directly to the TEMPLATE_HEADERS row starting with 'type'
        const rows = [
            ['@era', 'id', 'name', 'age', 'dateFrom', 'dateTo', 'sort'],
            ['era1', 'Childhood', '0', '2000-01-01', '', '1000'],
            ['@experience', 'id', 'name', 'eraId', 'dateFrom', 'dateTo', 'isOngoing', 'sort'],
            ['exp1', 'School', 'era1', '2003-09-01', '2006-06-15', 'false', '500'],
            ['type', 'date', 'time', 'eventTitle', 'eventNotes', 'location'],
            ['event', '2000-06-15', '12:00', 'Birthday', 'A party', 'Home'],
        ];

        const { eraRows, experienceRows, eventRows } = _extractSections(rows);

        expect(eraRows).toHaveLength(1);
        expect(eraRows[0][0]).toBe('era1');

        expect(experienceRows).toHaveLength(1);
        expect(experienceRows[0][0]).toBe('exp1');

        // CRITICAL: 'type' header and event data must route to eventRows
        expect(eventRows).toHaveLength(2);
        expect(eventRows[0][0]).toBe('type');
        expect(eventRows[1][0]).toBe('event');
    });
});

describe('CSV Era Row Parsing', () => {
    it('should parse era rows with all fields', () => {
        const eraRows = [
            ['era_abc', 'Childhood', '0', '2000-01-01', '2010-01-01', '1000'],
            ['era_def', 'Adulthood', '315360000', '2010-01-01', '', '2000'],
        ];

        const eras = _parseEraRows(eraRows);

        expect(eras).toHaveLength(2);
        expect(eras[0].origId).toBe('era_abc');
        expect(eras[0].name).toBe('Childhood');
        expect(eras[0].age).toBe(0);
        expect(eras[0].dateFrom).toBe('2000-01-01');
        expect(eras[0].dateTo).toBe('2010-01-01');
        expect(eras[0].sort).toBe(1000);

        expect(eras[1].origId).toBe('era_def');
        expect(eras[1].dateTo).toBe('');
    });

    it('should skip header-like rows where id column says "id"', () => {
        const eraRows = [
            ['id', 'name', 'age', 'dateFrom', 'dateTo', 'sort'],
            ['era1', 'Life', '0', '2000-01-01', '', '0'],
        ];

        const eras = _parseEraRows(eraRows);
        expect(eras).toHaveLength(1);
        expect(eras[0].origId).toBe('era1');
    });

    it('should handle missing fields with defaults', () => {
        const eraRows = [
            ['era1'],
        ];

        const eras = _parseEraRows(eraRows);
        expect(eras).toHaveLength(0); // row.length < 3, skipped
    });

    it('should use "Imported Era" for empty names', () => {
        const eraRows = [
            ['era1', '', '0', '2000-01-01', '', '0'],
        ];

        const eras = _parseEraRows(eraRows);
        expect(eras[0].name).toBe('Imported Era');
    });
});

describe('CSV Experience Row Parsing', () => {
    it('should parse experience rows with all fields', () => {
        const expRows = [
            ['exp1', 'School Days', 'era1', '2003-09-01', '2006-06-15', 'false', '1000'],
            ['exp2', 'Career', 'era2', '', '', 'true', '2000'],
        ];

        const exps = _parseExperienceRows(expRows);

        expect(exps).toHaveLength(2);
        expect(exps[0].origId).toBe('exp1');
        expect(exps[0].name).toBe('School Days');
        expect(exps[0].origEraId).toBe('era1');
        expect(exps[0].dateFrom).toBe('2003-09-01');
        expect(exps[0].dateTo).toBe('2006-06-15');
        expect(exps[0].isOngoing).toBe(false);

        expect(exps[1].origId).toBe('exp2');
        expect(exps[1].isOngoing).toBe(true);
        expect(exps[1].dateFrom).toBe('');
    });

    it('should skip header rows', () => {
        const expRows = [
            ['id', 'name', 'eraId', 'dateFrom', 'dateTo', 'isOngoing', 'sort'],
            ['exp1', 'Test', 'era1', '', '', 'false', '0'],
        ];

        const exps = _parseExperienceRows(expRows);
        expect(exps).toHaveLength(1);
    });

    it('should use "Imported Experience" for empty names', () => {
        const expRows = [
            ['exp1', '', 'era1', '', '', 'false', '0'],
        ];

        const exps = _parseExperienceRows(expRows);
        expect(exps[0].name).toBe('Imported Experience');
    });
});

describe('CSV Round-Trip Semantic Boundary Tests', () => {
    // Boundary-trace: era age must survive round-trip as integer seconds.
    // 10 years = 315360000 seconds. No float drift.

    it('era age must round-trip as integer seconds (no float drift)', () => {
        const tenYears = 10 * 31536000;
        const eraRows = [
            ['era1', 'Decade', String(tenYears), '2000-01-01', '2010-01-01', '0'],
        ];
        const eras = _parseEraRows(eraRows);
        expect(eras[0].age).toBe(tenYears);
        expect(Number.isInteger(eras[0].age)).toBe(true);
    });

    it('experience isOngoing must survive false/true round-trip', () => {
        const expRows = [
            ['exp1', 'Closed', 'era1', '2020-01-01', '2025-01-01', 'false', '0'],
            ['exp2', 'Open', 'era2', '', '', 'true', '0'],
        ];
        const exps = _parseExperienceRows(expRows);
        expect(exps[0].isOngoing).toBe(false);
        expect(exps[1].isOngoing).toBe(true);
    });

    it('experience dateTo must be empty string (not null) for ongoing', () => {
        const expRows = [
            ['exp1', 'Open Exp', 'era1', '', '', 'true', '0'],
        ];
        const exps = _parseExperienceRows(expRows);
        expect(exps[0].dateTo).toBe('');
        expect(exps[0].dateFrom).toBe('');
    });

    it('era dateTo must be empty string for open-ended eras', () => {
        const eraRows = [
            ['era1', 'Life', '0', '2000-01-01', '', '0'],
        ];
        const eras = _parseEraRows(eraRows);
        expect(eras[0].dateTo).toBe('');
    });
});