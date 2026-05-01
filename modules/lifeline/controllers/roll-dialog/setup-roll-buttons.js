import { setSlider } from './set-slider.js';
import { generateInfoBoxes } from './generate-info-boxes.js';
import { generateVehicleInfoBoxes } from './generate-vehicle-info-boxes.js';
import { updateMetabilityInfo } from './update-metability-info.js';
import { ResonanceCalculator } from '../../services/calculators/resonance-calculator.js';
import { injectBenefitButtons } from './inject-benefit-buttons.js';

const ASPECT_LABELS = {
    firearm: { aspect1: 'Handling', aspect2: 'Ammo', aspect3: 'Reliability' },
    technology: { aspect1: 'Speed', aspect2: 'Capacity', aspect3: 'Connectivity' },
    tool: { aspect1: 'Quality', aspect2: 'Versatility', aspect3: 'Durability' },
    vehicle: { aspect1: 'Handling', aspect2: 'Acceleration', aspect3: 'Prestige' }
};

function populateGearDropdown(html, sheet, isMeta) {
    const gearSelect = html.find('.gear-select').empty();
    gearSelect.append('<option value="">None</option>');

    const allGear = sheet.actor.items.filter(i => i.type === 'gear');
    if (!allGear.length) return;

    const techAndTools = allGear.filter(i => {
        const gt = i.system.gearType || 'technology';
        return gt === 'technology' || gt === 'tool';
    });
    const firearms = allGear.filter(i => (i.system.gearType || 'technology') === 'firearm');
    const vehicles = allGear.filter(i => (i.system.gearType || 'technology') === 'vehicle');

    if (isMeta) {
        if (techAndTools.length) {
            const optgroup = $('<optgroup label="Equipment"></optgroup>');
            techAndTools.forEach(item => {
                const bonus = Math.floor(((Number(item.system.aspects?.aspect1) || 0) + (Number(item.system.aspects?.aspect2) || 0) + (Number(item.system.aspects?.aspect3) || 0)) / 3);
                optgroup.append(`<option value="${item.id}">${item.name} (+${bonus})</option>`);
            });
            gearSelect.append(optgroup);
        }
    } else {
        if (techAndTools.length) {
            const optgroup = $('<optgroup label="Equipment"></optgroup>');
            techAndTools.forEach(item => {
                const bonus = Math.floor(((Number(item.system.aspects?.aspect1) || 0) + (Number(item.system.aspects?.aspect2) || 0) + (Number(item.system.aspects?.aspect3) || 0)) / 3);
                optgroup.append(`<option value="${item.id}">${item.name} (+${bonus})</option>`);
            });
            gearSelect.append(optgroup);
        }
        if (firearms.length) {
            const optgroup = $('<optgroup label="Firearms"></optgroup>');
            firearms.forEach(item => {
                const bonus = Math.floor(((Number(item.system.aspects?.aspect1) || 0) + (Number(item.system.aspects?.aspect2) || 0) + (Number(item.system.aspects?.aspect3) || 0)) / 3);
                optgroup.append(`<option value="${item.id}">${item.name} (+${bonus})</option>`);
            });
            gearSelect.append(optgroup);
        }
        if (vehicles.length) {
            const optgroup = $('<optgroup label="Vehicles"></optgroup>');
            vehicles.forEach(item => {
                const bonus = Math.floor(((Number(item.system.aspects?.aspect1) || 0) + (Number(item.system.aspects?.aspect2) || 0) + (Number(item.system.aspects?.aspect3) || 0)) / 3);
                optgroup.append(`<option value="${item.id}">${item.name} (+${bonus})</option>`);
            });
            gearSelect.append(optgroup);
        }
    }
}

// Attaches click handlers to all roll-triggering buttons on the character sheet.
// When clicked, populates and shows the dice roller dialog.
export function setupRollButtons(html, sheet, content, setVisible, benefitRef) {
    html.find('.roll-attribute, .roll-weapon, .roll-ap, .roll-vehicle').on('click', (e) => {
        const btn = $(e.currentTarget);
        const key = btn.data('attribute') || (btn.hasClass('roll-vehicle') ? 'quick' : null);
        const isAp = btn.hasClass('roll-ap');
        const isWeapon = btn.hasClass('roll-weapon');
        const isVehicle = btn.hasClass('roll-vehicle');
        const isMeta = key?.startsWith('meta-');

        content.data({
            attributeKey: key,
            isApRoll: isAp,
            isVehicleRoll: isVehicle,
            weaponId: isWeapon ? btn.data('id') : null,
            weaponType: btn.closest('.combat-subsection')?.find('h3').text().toLowerCase().includes('melee') ? 'melee' : 'ranged'
        });

        html.find('.rolling-attribute-name').text(btn.text());
        html.find('.dialog-resonance-section').toggle(!isMeta && !isVehicle);
        html.find('.dialog-push-section').toggle(!!isMeta || !!isVehicle);
        html.find('.dialog-gear-section').toggle(!isMeta);
        html.find('.dialog-modifier-section').toggle(!!isMeta);
        html.find('input[name="resonance_choice"][value="none"]').prop('checked', true);

        // Reset situational modifier input and bonus slider to 0
        content.data({ gearId: null });
        html.find('input[name="situational_modifier"]').val(0);
        const bonusSliderPointer = html.find('.dialog-gear-section .push-slider-pointer, .dialog-modifier-section .push-slider-pointer');
        bonusSliderPointer.css({ 'left': '50%' });
        html.find('.gear-slider-value').text('+0');

        populateGearDropdown(html, sheet, isMeta);

        // If a custom firearm button was clicked, pre-select the gear in the dropdown
        const gearId = btn.data('gear-id');
        if (gearId) {
            const gearItem = sheet.actor.items.get(gearId);
            if (gearItem) {
                content.data('gearId', gearId);
                const gearSelect = html.find('.gear-select');
                gearSelect.val(gearId);
                const a1 = Number(gearItem.system.aspects?.aspect1) || 0;
                const a2 = Number(gearItem.system.aspects?.aspect2) || 0;
                const a3 = Number(gearItem.system.aspects?.aspect3) || 0;
                const computedBonus = Math.floor((a1 + a2 + a3) / 3);
                html.find('input[name="situational_modifier"]').val(computedBonus);
            }
        }

        if (isMeta) {
            html.find('.push-slider-container .push-slider-background').attr('src', 'systems/continuum-v2/assets/metability-push-slider.png');
            const clean = key.substring(5);
            const rank = Number(sheet.actor.system.metabilities[clean]?.value) || 0;
            content.data({ actualRank: rank, selectedRank: rank });
            generateInfoBoxes(clean, html);
            setSlider(rank, html);
            updateMetabilityInfo(clean, rank, html);
            html.find('.push-modifier-display').text('(+0)');
            const appSelect = html.find('.metability-application-select');
            appSelect.empty().append('<option value="0">None (+0)</option>');
            const apps = sheet.actor.system.metabilities.applications || {};
            Object.values(apps).forEach(app => {
                const level = Number(app.level) || 1;
                appSelect.append(`<option value="${level}">${app.name} (${level})</option>`);
            });
            html.find('.metability-application-selection').show();
        } else if (isVehicle) {
            html.find('.metability-application-selection').hide();
            html.find('.push-slider-container .push-slider-background').attr('src', 'systems/continuum-v2/assets/vehicle-speed-slider.png');
            const vehicleId = btn.data('id');
            const vehicle = sheet.actor.system.vehicles[vehicleId] ||
                            sheet.actor.system.airVehicles[vehicleId] ||
                            sheet.actor.system.waterVehicles[vehicleId];
            if (vehicle) {
                const topSpeed = Number(vehicle.speedBlocks) || 1;
                content.data({ vehicleId, topSpeed, selectedSpeed: topSpeed, selectedRank: topSpeed });
                generateVehicleInfoBoxes(vehicle, html);
                setSlider(topSpeed, html);
                html.find('.push-modifier-display').text('(+0)');
            }
        } else {
            html.find('.metability-info-container').empty().hide();
            const exps = ResonanceCalculator.calculate(sheet.actor).sort((a, b) => b.bonus - a.bonus);
            const sel = html.find('.experience-resonance-select').empty().append('<option value="0">Select Experience...</option>');
            if (isWeapon) sel.append('<option value="1">Generic Experience (+1)</option>');
            exps.forEach(ex => sel.append(`<option value="${ex.bonus}">${ex.name} (+${ex.bonus})</option>`));
        }

        injectBenefitButtons(html, sheet.actor, benefitRef);
        setVisible(true);
    });
}
