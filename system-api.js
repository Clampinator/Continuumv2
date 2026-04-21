import { DefenderProfile } from './modules/combat/defender-profile.js';
import { calculateQuickPenalty } from './modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js';

/**
 * Exposes a public API for the Continuum system, allowing modules and macros to interact with it.
 */
export const api = {
    /**
     * Rolls for Action Points based on a character's attribute.
     */
    async rollAP({ actor, attribute = 'body' }) {
        // 1. Calculate the base target value for the roll from the actor's attribute.
        let baseTarget = Math.floor(foundry.utils.getProperty(actor, `system.attributes.${attribute}.value`) || 0);

        // 2. Apply wound penalties from total IP damage.
        const wounds = actor.system.combat?.wounds ?? {};
        const ipTotal = Object.values(wounds).reduce((total, wound) => total + (Number(wound.ip) || 0), 0);
        baseTarget -= Math.floor(ipTotal);

        // 3. Apply unified Quick Penalty (Armor + Weapons + Gear)
        if (attribute === 'quick' || attribute === 'spanning') {
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
        const attributeName = attribute.charAt(0).toUpperCase() + attribute.slice(1);
        const flavorText = `${actor.name} rolls for ${attributeName} Action Points`;
        const outcomeText = actionPoints > 0 ? `Gains ${actionPoints} Action Point${actionPoints > 1 ? 's' : ''}!` : "Botch! Gains no Action Points this round.";
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

        // Respect global Roll Mode setting
        ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));

        ChatMessage.create(chatData);

        if (window.CCW_setAPByActor) window.CCW_setAPByActor(actor.id, actionPoints);
        await actor.update({ 'flags.continuum-v2.lastAP': actionPoints }, { render: false });

        if (game.socket) {
          game.socket.emit('module.continuum-v2-combat-tracker', {
            type: 'ap-update',
            actorId: actor.id,
            actorName: actor.name,
            ap: actionPoints
          });
        }

        Hooks.callAll('continuum-v2.apRolled', actor, actionPoints);

        return actionPoints;
    },

    /**
     * Defensive Application API
     */
    DefenderProfile: DefenderProfile,

    /**
     * Locates the GM Console application instance.
     */
    getCombatConsole() {
        const cctModule = game.modules.get('continuum-combat-tracker');
        if (cctModule?.api?.getConsole) return cctModule.api.getConsole();
        if (window.ContinuumCombat?.getConsole) return window.ContinuumCombat.getConsole();
        return Object.values(ui.windows).find(w => 
            w.options?.id === "continuum-gm-console" || 
            w.constructor.name === "GmConsoleApp"
        );
    }
};
