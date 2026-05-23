import { CONFLICT_TYPE_MAP } from './org-map.js';

/**
 * Opens a dialog for the GM to record the outcome of a conflict engagement
 * and optionally drain Capital / Momentum from the target location actor.
 *
 * @param {ActorSheet} sheet     - The org actor sheet that owns the engagement.
 * @param {object}     engagement - The engagement object, enriched with phaseId and opId.
 */
export async function showResolveEngagementDialog(sheet, engagement) {
    const location = game.actors.get(engagement.targetLocationId);
    if (!location) {
        return ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.TargetLocationNotFound"));
    }

    const conflictInfo = CONFLICT_TYPE_MAP[engagement.conflictType] ?? CONFLICT_TYPE_MAP.physical;
    const locAttrLabel = conflictInfo.locAttr.charAt(0).toUpperCase() + conflictInfo.locAttr.slice(1);
    const locAttrVal   = location.system.attributes[conflictInfo.locAttr]?.value ?? 0;

    const capitalCurrent  = location.system.attributes.capital?.value  ?? 0;
    const capitalMax      = location.system.attributes.capital?.max    ?? 0;
    const momentumCurrent = location.system.attributes.momentum?.value ?? 0;
    const momentumMax     = location.system.attributes.momentum?.max   ?? 0;

    const currentNotes = engagement.description ?? '';

    const content = `
    <form style="display:flex;flex-direction:column;gap:12px;padding:8px 0;">
        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:8px 12px;font-size:0.9em;color:#bbb;">
            <div><strong style="color:#eee;">${location.name}</strong></div>
            <div>${game.i18n.localize("CONTINUUM.Dialogs2.ContestedAttribute")} <strong style="color:${conflictInfo.color};">${locAttrLabel} ${locAttrVal}</strong></div>
        </div>

        <div class="form-group">
            <label>${game.i18n.localize("CONTINUUM.Dialogs2.Outcome")}</label>
            <select name="outcome">
                <option value="victory">${game.i18n.localize("CONTINUUM.Dialogs2.Victory")}</option>
                <option value="draw">${game.i18n.localize("CONTINUUM.Dialogs2.Draw")}</option>
                <option value="defeat">${game.i18n.localize("CONTINUUM.Dialogs2.Defeat")}</option>
                <option value="ongoing">${game.i18n.localize("CONTINUUM.Dialogs2.Ongoing")}</option>
            </select>
        </div>

        <div class="form-group">
            <label>${game.i18n.localize("CONTINUUM.Dialogs2.DrainCapital")} <span style="color:#aaa;font-size:0.85em;">${game.i18n.format("CONTINUUM.Dialogs2.CurrentMax", {current: capitalCurrent, max: capitalMax})}</span></label>
            <input type="number" name="capitalDrain" value="0" min="0" max="${capitalCurrent}" />
        </div>

        <div class="form-group">
            <label>${game.i18n.localize("CONTINUUM.Dialogs2.DrainMomentum")} <span style="color:#aaa;font-size:0.85em;">${game.i18n.format("CONTINUUM.Dialogs2.CurrentMax", {current: momentumCurrent, max: momentumMax})}</span></label>
            <input type="number" name="momentumDrain" value="0" min="0" max="${momentumCurrent}" />
        </div>

        <div class="form-group">
            <label>${game.i18n.localize("CONTINUUM.Dialogs2.ResolutionNotes")}</label>
            <textarea name="eventNotes" placeholder="${game.i18n.localize('CONTINUUM.Dialogs2.RecordWhatHappened')}" style="height:80px;">${currentNotes}</textarea>
        </div>
    </form>`;

    new Dialog({
        eventTitle: game.i18n.format("CONTINUUM.Dialogs2.ResolveEngagement", {name: engagement.name}),
        content,
        buttons: {
            resolve: {
                label: game.i18n.localize("CONTINUUM.Dialogs2.ApplyResolution"),
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find('form')[0]).object;
                    const outcome      = fd.outcome;
                    const drainCap     = Math.max(0, Number(fd.capitalDrain)  || 0);
                    const drainMom     = Math.max(0, Number(fd.momentumDrain) || 0);
                    const eventNotes        = fd.eventNotes ?? currentNotes;

                    // Apply pool drain to the location actor
                    const locationUpdates = {};
                    if (drainCap > 0) locationUpdates['system.attributes.capital.value']  = Math.max(0, capitalCurrent  - drainCap);
                    if (drainMom > 0) locationUpdates['system.attributes.momentum.value'] = Math.max(0, momentumCurrent - drainMom);
                    if (Object.keys(locationUpdates).length > 0) await location.update(locationUpdates);

                    // Mark the engagement as resolved on the org actor
                    const base = `system.phases.${engagement.phaseId}.operations.${engagement.opId}.engagements.${engagement.id}`;
                    await sheet.actor.update({
                        [`${base}.outcome`]:     outcome,
                        [`${base}.resolved`]:    outcome !== 'ongoing',
                        [`${base}.description`]: eventNotes
                    });

                    // Notify
                    const drained = [];
                    if (drainCap > 0) drained.push(`${drainCap} Capital`);
                    if (drainMom > 0) drained.push(`${drainMom} Momentum`);
                    const suffix = drained.length ? game.i18n.format("CONTINUUM.Notifications.DrainedFromLocation", {drainList: drained.join(' and '), locationName: location.name}) : '';
                    ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.EngagementResolved", {outcome: outcome.charAt(0).toUpperCase() + outcome.slice(1), suffix}));
                }
            },
            cancel: { label: game.i18n.localize("CONTINUUM.Common.Cancel") }
        },
        default: "resolve"
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
