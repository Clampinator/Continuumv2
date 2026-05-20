import { describe, it, expect, vi } from 'vitest';
import { exportSpreadsheetCSV, downloadCSVTemplate } from '../../modules/lifeline/spreadsheet/csv-tools.js';

// Mock the global Blob and URL
global.Blob = class {
    constructor(content, options) {
        this.content = content;
        this.options = options;
    }
};
global.URL = {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
};

// Mock the DOM
global.document = {
    createElement: vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn()
    }))
};

// Mock getSpreadsheetRows
vi.mock('../../modules/lifeline/spreadsheet/get-spreadsheet-rows.js', () => ({
    getSpreadsheetRows: vi.fn(() => ({
        rows: [
            { id: 'e1', date: '2026-04-21', title: 'Test' }
        ]
    }))
}));

describe('CSV Tools (Export)', () => {
  it('should trigger a download for export', () => {
    const actor = { name: 'Test Actor' };
    exportSpreadsheetCSV(actor);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('should trigger a download for template', () => {
    downloadCSVTemplate();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
