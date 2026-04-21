/**
 * Standalone application for the Lifeline Spreadsheet (V2).
 */
export class LifelineSpreadsheetApp extends foundry.applications.api.ApplicationV2 {
  /**
   * @param {ActorSheet} sheet - The sheet that launched this app.
   * @param {Object} options - Application options.
   */
  constructor(sheet, options = {}) {
    super(options);
    this.sheet = sheet;
    this.actor = sheet.actor;
    
    // Configure dynamic options
    this.options.id = `lifeline-spreadsheet-${this.actor.id}`;
    this.options.window.title = `Lifeline Spreadsheet: ${this.actor.name}`;
  }

  /** @override */
  static get DEFAULT_OPTIONS() {
    return {
      tag: 'form',
      classes: ['continuum-v2', 'lifeline-spreadsheet'],
      window: {
        icon: 'fas fa-file-excel',
        resizable: true,
        title: 'Lifeline Spreadsheet',
        template: 'systems/continuum-v2/templates/apps/lifeline-spreadsheet.hbs'
      },
      position: {
        width: 1000,
        height: 600
      }
    };
  }

  /** @override */
  async _prepareContext(options) {
      return {
          actor: this.actor,
          rows: [] // To be implemented in Phase 2
      };
  }
}
