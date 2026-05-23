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
        eventTitle: game.i18n.localize("CONTINUUM.Export.ImportLifeline"),
        content: `
            <div style="margin-bottom: 10px;">
                <p>${game.i18n.localize("CONTINUUM.Export.ImportInstructions")}</p>
                <p style="color: #ff6060; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> ${game.i18n.localize("CONTINUUM.Export.ImportWarning")}</p>
            </div>
            <textarea name="importJson" style="width:100%; height: 300px; font-family: monospace; white-space: pre; overflow-x: auto; background: #222; color: #fff; padding: 5px; border: 1px solid #555;"></textarea>
        `,
        buttons: {
            import: {
                label: game.i18n.localize("CONTINUUM.Export.ImportData"),
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
                        ui.notifications.info(game.i18n.localize("CONTINUUM.Export.ImportSuccess"));
                        sheet.render();
                    } catch (e) {
                        ui.notifications.error(game.i18n.format("CONTINUUM.Export.ImportFailed", {error: e.message}));
                    }
                }
            },
            cancel: { label: game.i18n.localize("CONTINUUM.Common.Cancel") }
        },
        default: "import"
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
