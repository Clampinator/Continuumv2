import { DefenderProfile } from './modules/combat/defender-profile.js';
import { calculateQuickPenalty } from './modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js';
import { batchGeocodeActor, batchGeocodeAllLinked } from './modules/spacetime-bridge/batch-geocode.js';
import { resolveLocation } from './modules/state/geocode-service.js';
import { getAttributeLabel } from './modules/attribute-labels.js';

/**
 * Exposes a public API for the Continuum system, allowing modules and macros to interact with it.
 */
export const api = {
    /**
     * Rolls for Action Points based on a character's attribute.
     */
    async rollAP({ actor, attribute = 'force' }) {
        // 1. Calculate the base target value for the roll from the actor's attribute.
        let baseTarget = Math.floor(foundry.utils.getProperty(actor, `system.attributes.${attribute}.value`) || 0);

        // 2. Apply wound penalties from total IP damage.
        const wounds = actor.system.combat?.wounds ?? {};
        const ipTotal = Object.values(wounds).reduce((total, wound) => total + (Number(wound.ip) || 0), 0);
        baseTarget -= Math.floor(ipTotal);

        // 3. Apply unified React Penalty (Armor + Weapons + Gear)
        if (attribute === 'react' || attribute === 'spanning') {
            const penalty = calculateQuickPenalty(actor);
            baseTarget -= penalty;
        }

        const finalTarget = Math.floor(baseTarget);

        // 4. Perform the roll using the system's formula (Target - d10 result).
        // Formula: Target - (floor(2d10/2))
        const roll = new Roll(`${finalTarget} - (floor(2d10/2))`);
        await roll.evaluate();

        // 5. Calculate Action Points based on the margin of success.
        const successMargin = roll.total;
        let actionPoints = 0;
        if (successMargin >= 4) {
            actionPoints = 3;
        } else if (successMargin >= 2) {
            actionPoints = 2;
        } else if (successMargin >= -5) { // A normal failure still grants 1 AP.
            actionPoints = 1;
        }

        // 6. Announce the roll and its result to the chat for transparency.
        const attributeName = getAttributeLabel(attribute);
        const flavorText = game.i18n.format("CONTINUUM.Chat.RollsForAP", {name: actor.name, attribute: attributeName});
        const outcomeText = actionPoints > 0 ? game.i18n.format("CONTINUUM.Chat.GainsActionPoints", {count: actionPoints, s: actionPoints > 1 ? 's' : ''}) : game.i18n.localize("CONTINUUM.Chat.BotchNoAP");
        const outcomeColor = actionPoints > 0 ? "#28a745" : "#b30000";

        const content = await roll.render();
        const finalContent = content + `<h4 style="text-align: center; color: ${outcomeColor}; border-top: 1px solid #BBB; padding-top: 5px; margin-top: 5px;">${outcomeText}</h4>`;

        const chatData = {
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: flavorText,
            content: finalContent,
            rolls: [roll],
            sound: CONFIG.sounds.dice
        };

        // NPC rolls are always whispered to GM only.
        // PC rolls respect the global Roll Mode setting.
        const rollMode = actor.hasPlayerOwner
            ? game.settings.get("core", "rollMode")
            : CONST.DICE_ROLL_MODES.PRIVATE;
        ChatMessage.applyRollMode(chatData, rollMode);

        ChatMessage.create(chatData);

        if (window.CCW_setAPByActor) window.CCW_setAPByActor(actor.id, actionPoints);

        // Emit before actor.update() so a permission error can't abort the broadcast
        if (game.socket) {
            game.socket.emit('module.continuum-combat-tracker', {
                type: 'ap-update',
                actorId: actor.id,
                actorName: actor.name,
                ap: actionPoints
            });
        }

        Hooks.callAll('continuum-v2.apRolled', actor, actionPoints);

        // Best-effort flag write - non-owners may lack permission; failure is non-fatal
        try {
            await actor.update({ 'flags.continuum-v2.lastAP': actionPoints }, { render: false });
        } catch (e) {
            // Intentionally swallowed - the socket path above is the authoritative update
        }

        return actionPoints;
    },

    /**
     * Defensive Application API
     */
    DefenderProfile: DefenderProfile,

    /**
     * Locates the GM console application instance.
     */
    getCombatConsole() {
        const cctModule = game.modules.get('continuum-combat-tracker');
        if (cctModule?.api?.getConsole) return cctModule.api.getConsole();
        if (window.ContinuumCombat?.getConsole) return window.ContinuumCombat.getConsole();
        return Object.values(ui.windows).find(w => 
            w.options?.id === "continuum-gm-console" || 
            w.constructor.name === "GmConsoleApp"
        );
    },

    /**
     * Batch geocode: resolves location text -> lat/lng for all events
     * on an actor (or all linked actors). Used to fix characters whose
     * events have location text but no coordinates.
     */
    batchGeocodeActor,
    batchGeocodeAllLinked,

    /**
     * Resolve a location text string to { lat, lng, zoom } coordinates.
     * Checks Location actors first, then cache, then Nominatim.
     * Used internally by insert/update-history-row for automatic geocoding.
     * Can also be called manually from macros or the console.
     */
    resolveLocation
};