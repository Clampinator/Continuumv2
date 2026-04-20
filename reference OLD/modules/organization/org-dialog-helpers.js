export function safeFloat(val) {
    const f = parseFloat(val);
    return Number.isFinite(f) ? f : null;
}

export function buildUnitOptions(sheet) {
    let options = `<option value="">-- Headquarters --</option>`;
    const conflict = sheet.actor.system.conflict || {};
    const types = ['physical', 'espionage', 'psyops', 'online'];

    types.forEach(type => {
        if (conflict[type]) {
            Object.entries(conflict[type]).forEach(([id, unit]) => {
                const name = unit.description || unit.role || unit.type || "Unnamed Unit";
                options += `<option value="${id}">${name} (${type})</option>`;
            });
        }
    });
    return options;
}
