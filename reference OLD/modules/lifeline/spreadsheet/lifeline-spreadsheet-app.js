import { getSpreadsheetRows } from './get-spreadsheet-rows.js';
import { bindSpreadsheetListeners } from './bind-spreadsheet-listeners.js';

/*
Application window showing all lifeline events in spreadsheet format.
Bidirectional sync: listens for actor updates via hook and re-renders automatically.
One instance per actor - managed by open-lifeline-spreadsheet.js.
*/
export class LifelineSpreadsheetApp extends Application {
    constructor(sheet, options = {}) {
        super(options);
        this.sheet = sheet;
        this.actor = sheet.actor;
        this.sortNewestFirst = false;
        // Set of eventIds that are currently expanded (survives re-renders)
        this._expandedRows = new Set();
        this._hookId = null;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'lifeline-spreadsheet',
            title: 'Lifeline Spreadsheet',
            template: 'systems/continuum/templates/apps/lifeline-spreadsheet.html',
            classes: ['continuum', 'lifeline-spreadsheet'],
            width: 950,
            height: 620,
            resizable: true,
        });
    }

    getData() {
        const { rows, allExperiences, allEras } = getSpreadsheetRows(this.actor);
        // Always sort by age (timestamp). Direction toggled by sortNewestFirst.
        const sorted = [...rows].sort((a, b) => this.sortNewestFirst ? b.ts - a.ts : a.ts - b.ts);
        // Mark expanded state for template
        sorted.forEach(r => { r.isExpanded = this._expandedRows.has(r.eventId); });
        return {
            rows: sorted,
            allExperiences,
            allEras,
            sortNewestFirst: this.sortNewestFirst,
            actorName: this.actor.name
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        bindSpreadsheetListeners(this, html);
    }

    // Re-render when this actor's data changes.
    // Suppress re-renders while the user is actively typing in a field - replacing the DOM
    // would wipe their unsaved input. The save triggered by their subsequent blur will
    // fire another updateActor, which will re-render once they are done editing.
    _onActorUpdate(actor) {
        if (actor.id !== this.actor.id) return;
        const el = this.element?.[0];
        const active = document.activeElement;
        if (el && el.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            return;
        }
        this.render(false);
    }

    // Register the updateActor hook on first render
    async _render(force, options) {
        if (!this._hookId) {
            this._hookId = Hooks.on('updateActor', this._onActorUpdate.bind(this));
        }
        console.log(`[LSS] Spreadsheet re-rendering. Force: ${force}, Actor: ${this.actor?.name}`);
        return super._render(force, options);
    }

    // Clean up the hook when the window is closed
    async close(options) {
        if (this._hookId) {
            Hooks.off('updateActor', this._hookId);
            this._hookId = null;
        }
        return super.close(options);
    }
}
