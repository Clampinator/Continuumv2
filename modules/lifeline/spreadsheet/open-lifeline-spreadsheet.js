import { LifelineSpreadsheetApp } from './app-window.js';

// One instance per actor - reuse/focus rather than opening duplicates.
const _instances = {};

export function openLifelineSpreadsheet(sheet) {
    const actorId = sheet.actor.id;
    const existing = _instances[actorId];
    if (existing?.rendered) {
        existing.bringToTop();
        return existing;
    }
    const app = new LifelineSpreadsheetApp(sheet);
    _instances[actorId] = app;
    app.render(true);
    return app;
}
