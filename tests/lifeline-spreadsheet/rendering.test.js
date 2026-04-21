import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  global.foundry = {
    applications: {
      api: {
        ApplicationV2: class {
          constructor(options = {}) {
            this.options = {
                window: {},
                ...options
            };
          }
          render() {}
        }
      }
    },
    utils: {
      mergeObject: (a, b) => ({ ...a, ...b }),
      getProperty: (obj, path) => path.split('.').reduce((o, i) => o?.[i], obj)
    }
  };
});

describe('Spreadsheet Rendering', () => {
  it('should define the template path correctly in the app class', async () => {
    const { LifelineSpreadsheetApp } = await import('../../modules/lifeline/spreadsheet/app-window.js');
    expect(LifelineSpreadsheetApp.DEFAULT_OPTIONS.window.template).toBe('systems/continuum-v2/templates/apps/lifeline-spreadsheet.hbs');
  });
});
