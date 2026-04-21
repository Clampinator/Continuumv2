import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  const ApplicationV2 = class {
    constructor(options = {}) {
      this.options = this._initializeApplicationOptions(options);
    }
    _initializeApplicationOptions(options) {
      return { window: {}, ...options };
    }
    render() {}
  };

  global.foundry = {
    applications: {
      api: {
        ApplicationV2: ApplicationV2,
        HandlebarsApplicationMixin: (Base) => class extends Base {}
      }
    },
    utils: {
      mergeObject: (a, b) => ({ ...a, ...b }),
      getProperty: (obj, path) => path.split('.').reduce((o, i) => o?.[i], obj)
    }
  };
});

import { LifelineSpreadsheetApp } from '../../modules/lifeline/spreadsheet/app-window.js';

describe('LifelineSpreadsheetApp', () => {
  let actor;
  let sheet;

  beforeEach(() => {
    actor = {
      id: 'actor1',
      name: 'Test Actor',
      system: {
        eras: {}
      }
    };
    sheet = { actor };
  });

  it('should initialize with the correct actor', () => {
    const app = new LifelineSpreadsheetApp({ actor, sheet });
    expect(app.actor).toBe(actor);
  });

  it('should have a unique ID based on the actor', () => {
    const app = new LifelineSpreadsheetApp({ actor, sheet });
    expect(app.options.uniqueId).toBe(`lifeline-spreadsheet-${actor.id}`);
  });

  it('should define a default title containing the actor name', () => {
    const app = new LifelineSpreadsheetApp({ actor, sheet });
    expect(app.options.window.title).toContain(actor.name);
  });
});
