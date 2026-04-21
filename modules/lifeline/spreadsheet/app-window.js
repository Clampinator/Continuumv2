/**
 * Standalone application for the Lifeline Spreadsheet (V2).
 */
export class LifelineSpreadsheetApp extends foundry.applications.api.ApplicationV2 {
  /**
   * @param {Object} options - Application options.
   * @param {Actor} options.actor - The actor whose lifeline is being edited.
   * @param {ActorSheet} [options.sheet] - The sheet that launched this app.
   */
  constructor(options = {}) {
    super(options);
    this.sheet = options.sheet;
    this.actor = options.actor;
  }

  /** @override */
  static get DEFAULT_OPTIONS() {
    return {
      tag: 'form',
      classes: ['continuum-v2', 'lifeline-spreadsheet'],
      window: {
        icon: 'fas fa-file-excel',
        resizable: true,
        title: 'Lifeline Spreadsheet'
      },
      position: {
        width: 1000,
        height: 600
      }
    };
  }

  /** @override */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    
    // In ApplicationV2, we should use the options passed to the constructor
    const actor = options.actor;
    if (actor) {
        options.uniqueId = `lifeline-spreadsheet-${actor.id}`;
        options.window.title = `Lifeline Spreadsheet: ${actor.name}`;
    }
    
    return options;
  }

  /** @override */
  async _prepareContext(options) {
      return {
          actor: this.actor,
          rows: [] // To be implemented in Phase 2
      };
  }
}
