export function handleExportLifelineClick(sheet, event) {
    event.preventDefault();
    const actor = sheet.actor;
    const data = {
        name: actor.name,
        dob: actor.system.personal.dob,
        eras: actor.system.eras,
        goals: actor.system.goals,
        theYet: actor.system.theYet,
        meta: {
            version: game.system.version,
            exportDate: new Date().toISOString(),
            actorId: actor.id
        }
    };
    saveDataToFile(JSON.stringify(data, null, 2), "text/json", `${actor.name.slugify()}-lifeline.json`);
}

export async function handleImportLifelineClick(sheet, event) {
    event.preventDefault();

    new Dialog({
        title: "Import Lifeline Data",
        content: `
            <div style="margin-bottom: 10px;">
                <p>Paste the content of your <code>.json</code> export file below.</p>
                <p style="color: #ff6060; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> WARNING: This will completely overwrite all existing Eras, Experiences, Events, Goals, and Yet items.</p>
            </div>
            <textarea name="importJson" style="width:100%; height: 300px; font-family: monospace; white-space: pre; overflow-x: auto; background: #222; color: #fff; padding: 5px; border: 1px solid #555;"></textarea>
        `,
        buttons: {
            import: {
                label: "Import Data",
                icon: '<i class="fas fa-file-import"></i>',
                callback: async (html) => {
                    const jsonStr = html.find("textarea[name='importJson']").val();
                    if (!jsonStr) return;
                    try {
                        const data = JSON.parse(jsonStr);
                        const source = data.system || data;
                        const updates = {};
                        if (data.dob) updates['system.personal.dob'] = data.dob;
                        else if (source.personal?.dob) updates['system.personal.dob'] = source.personal.dob;

                        if (source.eras) updates['system.eras'] = source.eras;
                        else if (source.ages) updates['system.eras'] = source.ages; // legacy import support
                        if (source.goals) updates['system.goals'] = source.goals;
                        if (source.theYet) updates['system.theYet'] = source.theYet;

                        await sheet.actor.update(updates);
                        ui.notifications.info("Lifeline imported successfully.");
                        sheet.render();
                    } catch (e) {
                        ui.notifications.error(`Failed to import data: ${e.message}`);
                    }
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "import"
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
