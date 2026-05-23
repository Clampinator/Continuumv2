import { calculateBaseTarget } from '../../services/calculators/roll-math/calculate-base-target.js';
import { RollMath } from '../../services/calculators/roll-math.js';
import { RollActionHandler } from '../../handlers/roll-action-handler.js';
import { getAttributeLabel } from '../../../attribute-labels.js';
import { calculateGearBonus } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-bonus.js';
import { calculateSpeedModifier } from '/systems/continuum-v2/modules/temporal-kernel/speed-penalties.js';
import { getResonanceBonus } from '/systems/continuum-v2/modules/temporal-kernel/get-resonance-bonus.js';

// Reads dialog state, computes the final target number, and fires the roll.
// benefitRef.bonus is the flat bonus accumulated from toggled benefit buttons.
export async function executeSituationRoll(html, sheet, content, rollType, benefitRef) {
    const key = content.data('attributeKey');
    const isVehicle = content.data('isVehicleRoll');
    const isMeta = key && key.startsWith('meta-');
    const activeRank = Number(content.data('actualRank')) || 0;

    let base;
    if (isMeta) {
        base = calculateBaseTarget(sheet.actor, key, { activeRank });
    } else {
        base = RollMath.calculateBaseTarget(sheet.actor, key);
    }
    if (['react', 'quick', 'spanning', 'naturalSpan'].includes(key)) {
        base -= RollMath.getQuickPenalty(sheet.actor);
    }

    let bonus = 0;
    let appBonus = 0;

    if (isMeta) {
        appBonus = Number(html.find('.metability-application-select').val()) || 0;
        bonus = activeRank - Number(content.data('selectedRank'));
    } else if (isVehicle) {
        const topSpeed = content.data('topSpeed');
        const selectedSpeed = content.data('selectedSpeed');
        bonus = calculateSpeedModifier(selectedSpeed, topSpeed);
    } else {
        const res = html.find('input[name="resonance_choice"]:checked').val();
        bonus = getResonanceBonus(res);
    }

    // Gear bonus calculation (aspect average only; slider goes through sitMod)
    let gearBonus = 0;
    let gearName = null;
    const gearId = content.data('gearId');
    if (gearId) {
        const gearItem = sheet.actor.items.get(gearId);
        if (gearItem) {
            gearName = gearItem.name;
            gearBonus = calculateGearBonus(gearItem.system.aspects?.aspect1, gearItem.system.aspects?.aspect2, gearItem.system.aspects?.aspect3);
        }
    }

    // Spanning ability bonus (replaces gear for span rolls)
    let abilityBonus = 0;
    let abilityName = null;
    if (key === 'spanning') {
        const abilSelect = html.find('.spanning-ability-select');
        abilityBonus = Number(abilSelect.val()) || 0;
        if (abilityBonus > 0) abilityName = abilSelect.find('option:selected').text().split(' (+')[0];
    } else if (key === 'naturalSpan') {
        const abilSelect = html.find('.nat-span-ability-select');
        abilityBonus = Number(abilSelect.val()) || 0;
        if (abilityBonus > 0) abilityName = abilSelect.find('option:selected').text().split(' (+')[0];
    }

    const sitMod = Number(html.find('input[name="situational_modifier"]').val()) || 0;
    const benefitBonus = benefitRef ? benefitRef.bonus : 0;
    const total = Math.floor(base + bonus + appBonus + sitMod + benefitBonus + gearBonus + abilityBonus);

    const resSelect = html.find('.experience-resonance-select');
    const isExpSelected = resSelect.val() !== "0";
    let displayResName = "Resonance";
    let appName = null;
    if (isMeta) {
        const appNameRaw = html.find('.metability-application-select option:selected').text().split(' (')[0];
        if (appNameRaw && appNameRaw !== "None") {
            appName = appNameRaw;
        }
        displayResName = "Push";
    } else if (isVehicle) {
        displayResName = "Speed";
    } else if (isExpSelected) {
        displayResName = resSelect.find('option:selected').text().split(' (+')[0];
    }

    await RollActionHandler.execute({
        finalTarget: total,
        rollType,
        flavorText: `Rolling ${isVehicle ? 'Drive' : getAttributeLabel(key)} vs Target ${total}`,
        actor: sheet.actor,
        isApRoll: content.data('isApRoll'),
        weaponId: content.data('weaponId'),
        weaponType: content.data('weaponType'),
        attributeName: key,
        baseValue: Math.floor(base),
        sitMod: Math.floor(sitMod),
        pushBonus: isMeta ? Math.floor(bonus) : 0,
        resonanceName: displayResName,
        resBonus: Math.floor(bonus),
        appName,
        appBonus: isMeta ? Math.floor(appBonus) : 0,
        benefitBonus: Math.floor(benefitBonus),
        gearName,
        gearBonus: Math.floor(gearBonus),
        abilityName,
        abilityBonus: Math.floor(abilityBonus)
    });

    content.removeData('gearName');
}
