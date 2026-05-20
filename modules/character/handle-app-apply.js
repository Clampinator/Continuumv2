/*
Opens the standard Metability roll dialog when an Application's Apply button
is clicked. The dominant ingredient (highest value in the app) determines
which metability roll button to trigger. The dialog's application dropdown
is pre-selected, and the push slider zero point is overridden to reflect
the highest ingredient rank in the app rather than the actor's full rank.
*/

import { RollDialogController } from '../lifeline/controllers/roll-dialog-controller.js';

const META_KEYS = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];

function _dominantIngredient(app) {
    let best = null;
    let bestVal = 0;
    for (const key of META_KEYS) {
        const v = Number(app[key]) || 0;
        if (v > bestVal) { bestVal = v; best = key; }
    }
    return best;
}

export function handleAppApply(sheet, event) {
    const button = $(event.currentTarget);
    const appId = button.data('id');
    const actor = sheet.actor;
    const app = actor.system.metabilities?.applications?.[appId];
    if (!app) return;

    const dominant = _dominantIngredient(app);
    if (!dominant) {
        ui.notifications.warn("No ingredients have been set for this application.");
        return;
    }

    // Trigger the standard roll dialog for the dominant metability (synchronous).
    const rollBtn = sheet.element.find(`.roll-attribute[data-attribute="meta-${dominant}"]`);
    rollBtn.trigger('click');

    // Override the slider zero point to the highest ingredient rank in this app,
    // not the actor's full rank in the dominant metability.
    const appHighestRank = Math.max(...META_KEYS.map(k => Number(app[k]) || 0));
    sheet.element.find('.dialog-content').data({ actualRank: appHighestRank, selectedRank: appHighestRank });
    RollDialogController.setSlider(appHighestRank, sheet.element);
    sheet.element.find('.push-modifier-display').text('(+0)');

    // Pre-select this application in the now-populated dropdown.
    const appLevel = Number(app.level) || 1;
    const targetText = `${app.name || ''} (${appLevel})`;
    sheet.element.find('.metability-application-select option').each(function() {
        if ($(this).text() === targetText) {
            $(this).prop('selected', true);
            return false;
        }
    });
}
