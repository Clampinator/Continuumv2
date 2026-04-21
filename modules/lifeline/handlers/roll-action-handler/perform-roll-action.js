
import { evaluateDiceRoll } from './evaluate-dice-roll.js';
import { calculateApResult } from './calculate-ap-result.js';
import { calculateStandardResult } from './calculate-standard-result.js';
import { mapHitLocation } from './map-hit-location.js';
import { calculateWeaponDamage } from './calculate-weapon-damage.js';
import { postToChat } from './post-to-chat.js';
import { checkGrace } from './check-grace.js';
import { RollMath } from '../../services/calculators/roll-math.js';
import { MitigationEngine } from '../../../combat/mitigation-engine.js';
import { getAttributeLabel } from '../../../attribute-labels.js';
import { DefenderProfile } from '../../../combat/defender-profile.js';

/**
 * Orchestrates the full roll workflow: evaluation, logic branching, and reporting.
 * @param {object} params 
 * @returns {Promise<ChatMessage>}
 */
export async function performRollAction(params) {
    const {
        finalTarget, rollType, flavorText, actor, isApRoll,
        weaponId, weaponType, attributeName, baseValue,
        sitMod, resonanceName, resBonus, pushBonus, gearName, gearBonus,
        benefitBonus = 0
    } = params;

    // 1. Roll Evaluation
    const { roll, delta } = await evaluateDiceRoll(finalTarget, rollType);

    // 2. Logic Branching
    const isMeta = attributeName?.startsWith('meta-');
    let outcome;
    if (isApRoll) {
        outcome = calculateApResult(delta);
    } else {
        outcome = calculateStandardResult(delta);
    }

    // 3. Optional Combat Resolution
    let hitInfo = { code: null, name: null };
    let weaponName = null;
    let damage = null;

    if (weaponId) {
        const weaponLookup = calculateWeaponDamage(actor, weaponId, weaponType, null);
        weaponName = weaponLookup.name;

        if (delta >= 0) {
            hitInfo = mapHitLocation(roll);
            const damageLookup = calculateWeaponDamage(actor, weaponId, weaponType, hitInfo.code);
            damage = damageLookup.damage;
        }
    }

    // 4. Defender Logic (Detection & Mitigation)
    // Uses the MitigationEngine exactly as defined in the locked file.
    let defenderName = null;
    let defenderUuid = null;
    let defenderProtection = 0;
    let mitigation = null;

    const targets = Array.from(game.user.targets);
    if (targets.length > 0 && hitInfo.code && damage !== null) {
        const targetToken = targets[0];
        const targetActor = targetToken.actor;
        defenderName = targetActor.name;
        defenderUuid = targetActor.uuid;
        defenderProtection = DefenderProfile.getProtection(targetActor, hitInfo.code);
        mitigation = MitigationEngine.calculateMitigation(damage, defenderProtection);

        if (mitigation.isDegraded) {
            await DefenderProfile.degradeArmor(targetActor, hitInfo.code);
        }
        if (mitigation.passedDamage > 0) {
            let finalDamage = mitigation.passedDamage;
            if (mitigation.damageType === 'Bruise' && targetActor.system.benefits?.tough) {
                finalDamage = Math.max(0, finalDamage - 1);
            }
            if (finalDamage > 0) {
                await DefenderProfile.applyWounds(targetActor, finalDamage, mitigation.damageType);
            }
        }
    }

    // 5. Calculate Data for Tactical Readout
    const cleanAttrKey = (attributeName || 'body').replace('meta-', '');
    let rawAttrVal = 0;
    if (isMeta) {
        rawAttrVal = Number(foundry.utils.getProperty(actor.system, `metabilities.${cleanAttrKey}.value`)) || 0;
    } else {
        rawAttrVal = Number(foundry.utils.getProperty(actor.system, `attributes.${cleanAttrKey}.value`)) || 0;
    }
    
    const wounds = actor.system.combat?.wounds ?? {};
    const ipPenalty = Object.values(wounds).reduce((total, wound) => total + (Number(wound.ip) || 0), 0);
    let armorPenalty = 0;
    if (['quick', 'spanning'].includes(cleanAttrKey)) {
        armorPenalty = RollMath.getQuickPenalty(actor);
    }
    let mindPenalty = 0;
    if (cleanAttrKey === 'mind') {
        mindPenalty = Math.abs(RollMath.getMindPenalty(actor));
    }

    let mathSummary = "";
    if (isMeta) {
        const metas = actor.system.metabilities;
        const highestRank = Math.max(
            Number(metas.coercion?.value) || 0,
            Number(metas.creativity?.value) || 0,
            Number(metas.farsense?.value) || 0,
            Number(metas.pk?.value) || 0,
            Number(metas.redaction?.value) || 0
        );
        const activeRank = Number(foundry.utils.getProperty(actor.system, `metabilities.${cleanAttrKey}.value`)) || 0;
        mathSummary = `Highest ${highestRank} + Active ${activeRank} + App ${resBonus} + Mod ${sitMod}${pushBonus !== 0 ? ` + Push ${pushBonus}` : ''}${gearBonus ? ` + Gear ${gearBonus}` : ''} = TN ${finalTarget}`;
    } else {
        mathSummary = `Base ${rawAttrVal} + Mod ${sitMod} + Res ${resBonus}${benefitBonus > 0 ? ` + Ben ${benefitBonus}` : ''}${gearBonus ? ` + Gear ${gearBonus}` : ''} - IP ${ipPenalty}${armorPenalty > 0 ? ` - ARM ${armorPenalty}` : ''}${mindPenalty > 0 ? ` - APP ${mindPenalty}` : ''} = TN ${finalTarget}`;
    }

    const displayAttr = attributeName ? getAttributeLabel(attributeName).toUpperCase() : 'CHECK';
    const situationLabel = rollType.toUpperCase();

    // 6. Extract Die Results
    const d10Part = roll.dice.find(d => d.faces === 10);
    const diceResults = d10Part?.results.map(r => ({
        value: r.result,
        discarded: r.active === false
    })) || [];

    // 7. Metability Consequences
    let consequence = null;
    if (isMeta && delta < 0) {
        const absDelta = Math.abs(delta);
        if (pushBonus < 0) {
            // Pushing Beyond Failure: Subtract abs(delta) from IP pool as a wound
            const cost = absDelta;
            const isBotch = outcome.cssClass === 'critical-failure';
            const woundName = isBotch ? "Push Botch (Bleeding)" : "Push Strain (Bruise)";
            const woundId = foundry.utils.randomID();

            await actor.update({
                [`system.combat.wounds.${woundId}`]: {
                    name: woundName,
                    ip: cost,
                    bleeding: isBotch,
                    sort: Date.now()
                }
            });
            consequence = { type: 'ip', value: cost, label: isBotch ? 'IP (Bleeding)' : 'IP (Bruise)' };
        } else if (pushBonus === 0) {
            // Flat Roll Failure: Subtract floor(abs(delta) / 2) from Temp Will
            const cost = Math.floor(absDelta / 2);
            if (cost > 0) {
                const currentWill = Number(foundry.utils.getProperty(actor.system, 'attributes.willpower.temp')) || 0;
                const newWill = Math.max(0, currentWill - cost);
                await actor.update({ 'system.attributes.willpower.temp': newWill });
                consequence = { type: 'will', value: cost, label: 'Temp Will' };
            }
        }
        // If pushBonus > 0 (Pulling), there is no consequence (Free Fail)
    }

    // 8. Grace Check (standard rolls only, exact match)
    await checkGrace(actor, delta, finalTarget, rollType);

    // 9. Reporting
    return postToChat(actor, flavorText, {
        whisperGM: isMeta,
        actorImg: actor.img,
        actorName: actor.name,
        attributeName: displayAttr,
        weaponName: weaponName,
        rawAttribute: rawAttrVal,
        baseValue: Math.floor(baseValue),
        sitMod: Math.floor(sitMod),
        resonanceName: resonanceName || 'Resonance',
        resBonus: Math.floor(resBonus),
        ipPenalty: ipPenalty,
        armorPenalty: armorPenalty,
        mindPenalty: mindPenalty,
        targetNumber: Math.floor(finalTarget),
        situationLabel: situationLabel,
        mathSummary: mathSummary,
        roll,
        diceResults,
        delta,
        resultText: outcome.text,
        resultClass: outcome.cssClass,
        hitLocation: hitInfo.code,
        locationName: hitInfo.name,
        damageDealt: damage,
        defenderName,
        defenderUuid,
        defenderProtection,
        mitigation,
        consequence,
        gearName: gearName || null,
        gearBonus: gearBonus || 0
    });
}
