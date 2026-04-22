/**
 * Opens the high-fidelity Span Result dialog.
 * This dialog handles time-travel specific logic including cost calculation.
 */
export async function openSpanDialog(sheet, params) {
    const actor = sheet.actor;
    const viewState = sheet._spanGraphViewport?.getViewState() || {};
    
    // 1. Data Context Preparation
    const templateData = {
        actor: actor,
        departure: params.departure, // {age, time}
        arrival: params.arrival,     // {age, time}
        isSpan: true
    };

    // 2. Render Template
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/continuum-v2/templates/dialogs/span-result-dialog.html", 
        templateData
    );

    let confirmed = false;

    // 3. Create Dialog
    const dialog = new Dialog({
        title: "Log Span Result",
        content: content,
        buttons: {
            save: {
                label: "Commit to Lifeline",
                icon: '<i class="fas fa-bolt"></i>',
                callback: async (html) => {
                    confirmed = true;
                    // Logic for submission will be in Phase 2
                }
            },
            cancel: {
                label: "Cancel",
                callback: () => {
                    confirmed = false;
                }
            }
        },
        default: "save",
        close: () => {
            // Revert NOW node or cleanup interaction state
            if (sheet._spanGraphViewport) {
                const viewport = sheet._spanGraphViewport;
                
                // DEFERRED RENDER: Ensures dialog is gone before graph updates
                setTimeout(() => {
                    if (sheet.rendered) viewport.updateActor(actor);
                }, 0);
            }
        }
    }, { classes: ["continuum-v2", "dialog"], width: 480 });

    dialog.render(true);
}
