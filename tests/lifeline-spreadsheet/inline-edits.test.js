import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bindSpreadsheetListeners } from '../../modules/lifeline/spreadsheet/bind-spreadsheet-listeners.js';

describe('Inline Edit Handlers', () => {
  let app;
  let html;

  beforeEach(() => {
    app = {
      actor: {
        update: vi.fn()
      }
    };
    
    // Mock jQuery-like fragment
    html = {
        find: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        val: vi.fn(),
        closest: vi.fn().mockReturnThis(),
        data: vi.fn()
    };
  });

  it('should define event listeners for grid inputs', () => {
    bindSpreadsheetListeners(app, html);
    // Verify that 'change' listener was attached to lss-field
    expect(html.on).toHaveBeenCalledWith('change', '.lss-field', expect.any(Function));
  });
});
