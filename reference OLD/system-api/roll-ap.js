import { RollMath } from '../modules/lifeline/services/calculators/roll-math.js';
import { evaluateDiceRoll } from '../modules/lifeline/handlers/roll-action-handler/evaluate-dice-roll.js';
import { calculateApResult } from '../modules/lifeline/handlers/roll-action-handler/calculate-ap-result.js';
import { postToChat } from '../modules/lifeline/handlers/roll-action-handler/post-to-chat.js';
import { getAttributeLabel } from '../modules/attribute-labels.js';

/**
 * Atomic logic for rolling Action Points.
 * Domain: system-api
 * @param {object} args - { actor, attribute }
 * @returns {Promise<number>} AP gained.
 */
export async function rollAP({ actor, attribute = 'body' }) {
    if (!actor) return 0;

    // 1. Target Calculation
    const base = RollMath.calculateBaseTarget(actor, attribute);
    
    // Unified rule: Quick and Spanning checks are penalised by total encumbrance
    const quickPenalty = (attribute === 'quick' || attribute === 'spanning') ? RollMath.getQuickPenalty(actor) : 0;
    const finalTarget = Math.floor(base - quickPenalty);
    
    const flavor = `${actor.name} rolls for ${getAttributeLabel(attribute)} Action Points`;

    // 2. Perform Roll
    const { roll, delta } = await evaluateDiceRoll(finalTarget, 'normal');

    // 3. Logic & UI
    const outcome = calculateApResult(delta);
    const actionPoints = outcome.ap;

    // Calculate Readout Data for the tactical template
    const cleanAttrKey = attribute.replace('meta-', '');
    const rawAttrVal = Number(foundry.utils.getProperty(actor.system, `attributes.${cleanAttrKey}.value`)) || 0;
    const wounds = actor.system.combat?.wounds ?? {};
    const ipPenalty = Object.values(wounds).reduce((total, wound) => total + (Number(wound.ip) || 0), 0);
    
    const mathSummary = `Base ${rawAttrVal} - IP ${ipPenalty}${quickPenalty > 0 ? ` - ARM ${quickPenalty}` : ''} = TN ${finalTarget}`;

    // Extract Die Results
    const d10Part = roll.dice.find(d => d.faces === 10);
    const diceResults = d10Part?.results.map(r => ({
        value: r.result,
        discarded: r.active === false
    })) || [];

    await postToChat(actor, flavor, {
        attributeName: getAttributeLabel(attribute).toUpperCase(),
        rawAttribute: rawAttrVal,
        baseValue: Math.floor(base),
        sitMod: 0,
        resonanceName: 'None',
        resBonus: 0,
        ipPenalty: ipPenalty,
        armorPenalty: quickPenalty,
        targetNumber: finalTarget,
        situationLabel: 'NORMAL',
        mathSummary: mathSummary,
        roll,
        diceResults,
        delta,
        resultText: outcome.text,
        resultClass: outcome.cssClass
    });

    // 4. Persistence & Broadcast
    await actor.update({ 'flags.continuum.lastAP': actionPoints }, { render: false });

    if (window.CCW_setAPByActor) window.CCW_setAPByActor(actor.id, actionPoints);

    if (game.socket) {
        game.socket.emit('module.continuum-combat-tracker', {
            type: 'ap-update',
            actorId: actor.id,
            actorName: actor.name,
            ap: actionPoints
        });
    }

    return actionPoints;
}