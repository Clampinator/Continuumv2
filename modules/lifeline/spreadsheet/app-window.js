import { getSpreadsheetRows } from './get-spreadsheet-rows.js';
import { bindSpreadsheetListeners } from './bind-spreadsheet-listeners.js';

/**
 * Standalone application for the Lifeline Spreadsheet (V2).
 * Uses the modern HandlebarsApplicationMixin for rendering.
 */
export class LifelineSpreadsheetApp extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2
) {
  /**
   * @param {Object} options - Application options.
   * @param {Actor} options.actor - The actor whose lifeline is being edited.
   * @param {ActorSheet} [options.sheet] - The sheet that launched this app.
   */
  constructor(options = {}) {
    super(options);
    this.sheet = options.sheet;
    this.actor = options.actor;
    this._sortNewestFirst = false;
  }

  /** @override */
  static get DEFAULT_OPTIONS() {
    return {
      tag: 'form',
      classes: ['continuum-v2', 'lifeline-spreadsheet'],
      window: {
        icon: 'fas fa-file-excel',
        resizable: true,
        eventTitle: 'Lifeline Spreadsheet'
      },
      position: {
        width: 1000,
        height: 600
      }
    };
  }

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/continuum-v2/templates/apps/lifeline-spreadsheet.hbs'
    }
  };

  /** @override */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    
    const actor = options.actor;
    if (actor) {
        options.uniqueId = `lifeline-spreadsheet-${actor.id}`;
        options.window.eventTitle = `Lifeline Spreadsheet: ${actor.name}`;
    }
    
    return options;
  }

  /** @override */
  async _prepareContext(options) {
      const { rows, allExperiences, allEras } = getSpreadsheetRows(this.actor);

      // Invert sort order if player toggled to newest-first
      if (this._sortNewestFirst) {
          rows.reverse();
      }

      return {
          actor: this.actor,
          rows,
          allExperiences,
          allEras,
          sortNewestFirst: this._sortNewestFirst
      };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    // AUTHORITY: Attach the refactored listeners to the rendered HTML
    const html = $(this.element);
    bindSpreadsheetListeners(this, html);
  }
}
