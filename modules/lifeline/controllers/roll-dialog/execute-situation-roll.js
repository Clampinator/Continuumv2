import { RollMath } from '../../services/calculators/roll-math.js';
import { RollActionHandler } from '../../handlers/roll-action-handler.js';
import { getAttributeLabel } from '../../../attribute-labels.js';

const SPEED_PENALTIES = [0, -3, -6, -9, -15];

// Reads dialog state, computes the final target number, and fires the roll.
// benefitRef.bonus is the flat bonus accumulated from toggled benefit buttons.
export async function executeSituationRoll(html, sheet, content, rollType, benefitRef) {
    const key = content.data('attributeKey');
    const isVehicle = content.data('isVehicleRoll');

    let base = RollMath.calculateBaseTarget(sheet.actor, key);
    if (['quick', 'spanning', 'naturalSpan'].includes(key)) {
        base -= RollMath.getQuickPenalty(sheet.actor);
    }

    let bonus = 0;
    let appBonus = 0;
    const isMeta = key && key.startsWith('meta-');

    if (isMeta) {
        const metas = sheet.actor.system.metabilities;
        const highestRank = Math.max(
            Number(metas.coercion?.value) || 0,
            Number(metas.creativity?.value) || 0,
            Number(metas.farsense?.value) || 0,
            Number(metas.pk?.value) || 0,
            Number(metas.redaction?.value) || 0
        );
        const activeRank = Number(content.data('actualRank')) || 0;
        base = highestRank + activeRank;
        appBonus = Number(html.find('.metability-application-select').val()) || 0;
        bonus = activeRank - Number(content.data('selectedRank'));
    } else if (isVehicle) {
        const topSpeed = content.data('topSpeed');
        const selectedSpeed = content.data('selectedSpeed');
        if (selectedSpeed <= topSpeed) {
            bonus = topSpeed - selectedSpeed;
        } else {
            const penaltyIndex = selectedSpeed - topSpeed - 1;
            bonus = SPEED_PENALTIES[penaltyIndex] ?? SPEED_PENALTIES[SPEED_PENALTIES.length - 1];
        }
    } else {
        const res = html.find('input[name="resonance_choice"]:checked').val();
        bonus = res === 'strong' ? 3 : (res === 'firm' ? 2 : (res === 'slight' ? 1 : 0));
    }

    // Gear bonus calculation (aspect average only; slider goes through sitMod)
    let gearBonus = 0;
    let gearName = null;
    const gearId = content.data('gearId');
    if (gearId) {
        const gearItem = sheet.actor.items.get(gearId);
        if (gearItem) {
            gearName = gearItem.name;
            const a1 = Number(gearItem.system.aspects?.aspect1) || 0;
            const a2 = Number(gearItem.system.aspects?.aspect2) || 0;
            const a3 = Number(gearItem.system.aspects?.aspect3) || 0;
            gearBonus = Math.floor((a1 + a2 + a3) / 3);
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
    if (isMeta) {
        const appName = html.find('.metability-application-select option:selected').text().split(' (')[0];
        displayResName = appName !== "None" ? appName : "Push";
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
        resBonus: Math.floor(isMeta ? appBonus : bonus),
        benefitBonus: Math.floor(benefitBonus),
        gearName,
        gearBonus: Math.floor(gearBonus),
        abilityName,
        abilityBonus: Math.floor(abilityBonus)
    });

    content.removeData('gearName');
}
