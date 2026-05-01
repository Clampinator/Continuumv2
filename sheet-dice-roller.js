// sheet-dice-roller.js
import { RollDialogController } from './modules/lifeline/controllers/roll-dialog-controller.js';
import { setupRollButtons } from './modules/lifeline/controllers/roll-dialog/setup-roll-buttons.js';
import { executeSituationRoll } from './modules/lifeline/controllers/roll-dialog/execute-situation-roll.js';

// Initializes the dice rolling logic for a Continuum actor sheet.
export function initializeDiceRoller(html, sheet) {
    const overlay = html.find('.dialog-overlay');
    const content = html.find('.dialog-content');
    const dialogToggle = html.find('input[name="dialog_flag"]');
    const SPEED_PENALTIES = [0, -3, -6, -9, -15];
    const benefitRef = { bonus: 0 };

    const setVisible = (v) => {
        dialogToggle.prop('checked', v).trigger('change');
        if (overlay.length) overlay.css('display', v ? 'flex' : 'none');
    };

    overlay.on('click', (e) => {
        if (e.target === e.currentTarget) setVisible(false);
    });

    html.find('.resonance-buttons label').on('click', (e) => {
        const label = $(e.currentTarget);
        const forId = label.attr('for');
        if (forId) {
            const input = html.find(`#${forId}`);
            if (input.length) input.prop('checked', true).trigger('change');
        }
    });

    html.find('.experience-resonance-select').on('change', (e) => {
        const bonusValue = parseInt(e.currentTarget.value) || 0;
        let resonanceKey = 'none';
        if (bonusValue >= 3) resonanceKey = 'strong';
        else if (bonusValue >= 2) resonanceKey = 'firm';
        else if (bonusValue >= 1) resonanceKey = 'slight';
        const radio = html.find(`input[name="resonance_choice"][value="${resonanceKey}"]`);
        if (radio.length) radio.prop('checked', true).trigger('change');
    });

    // Gear selection dropdown - store selected gear item ID
    html.find('.gear-select').on('change', (e) => {
        const gearId = e.currentTarget.value || null;
        content.data('gearId', gearId);
    });

    // Metability/Vehicle push slider drag
    html.find('.push-slider-container').on('pointerdown', (event) => {
        event.preventDefault();
        const container = $(event.currentTarget);
        container.addClass('active');
        const rankPositions = { 1: 10, 2: 30, 3: 50, 4: 70, 5: 90 };

        const updateSlider = (moveEvent) => {
            const rect = container[0].getBoundingClientRect();
            const x = moveEvent.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            let closestRank = 1;
            let minDistance = Infinity;
            for (let i = 1; i <= 5; i++) {
                const dist = Math.abs(percentage - rankPositions[i]);
                if (dist < minDistance) { minDistance = dist; closestRank = i; }
            }
            if (closestRank !== content.data('selectedRank')) {
                const attrKey = content.data('attributeKey');
                const isMeta = attrKey?.startsWith('meta-');
                const isVehicle = content.data('isVehicleRoll');
                const actualRank = content.data('actualRank');
                content.data('selectedRank', closestRank);
                RollDialogController.setSlider(closestRank, html, false);
                if (isMeta) {
                    RollDialogController.updateMetabilityInfo(attrKey.substring(5), closestRank, html);
                    const mod = actualRank - closestRank;
                    html.find('.push-modifier-display').text(mod >= 0 ? `(+${mod})` : `(${mod})`);
                } else if (isVehicle) {
                    const topSpeed = content.data('topSpeed');
                    content.data('selectedSpeed', closestRank);
                    let mod = 0;
                    if (closestRank <= topSpeed) {
                        mod = topSpeed - closestRank;
                    } else {
                        const penaltyIndex = closestRank - topSpeed - 1;
                        mod = SPEED_PENALTIES[penaltyIndex] ?? SPEED_PENALTIES[SPEED_PENALTIES.length - 1];
                    }
                    html.find('.push-modifier-display').text(mod >= 0 ? `(+${mod})` : `(${mod})`);
                }
            }
        };

        updateSlider(event);
        $(document).on('pointermove.sliderDrag', updateSlider);
        $(document).on('pointerup.sliderDrag', () => {
            container.removeClass('active');
            $(document).off('.sliderDrag');
        });
    });

    // Bonus modifier slider drag (-4 to +4, 9 steps)
    // Writes the selected value directly into the situational_modifier input.
    const bonusPositions = {
        '-4': 5, '-3': 16.25, '-2': 27.5, '-1': 38.75,
        '0': 50,
        '1': 61.25, '2': 72.5, '3': 83.75, '4': 95
    };

    html.find('.gear-slider-container').on('pointerdown', (event) => {
        event.preventDefault();
        const container = $(event.currentTarget);
        container.addClass('active');

        const updateBonusSlider = (moveEvent) => {
            const rect = container[0].getBoundingClientRect();
            const x = moveEvent.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            let closestRank = 0;
            let minDistance = Infinity;
            for (const [rank, pos] of Object.entries(bonusPositions)) {
                const dist = Math.abs(percentage - pos);
                if (dist < minDistance) { minDistance = dist; closestRank = parseInt(rank); }
            }
            const pointer = container.find('.push-slider-pointer');
            pointer.css({ 'left': `${bonusPositions[String(closestRank)]}%` });
            // Write slider value into the situational modifier input
            html.find('input[name="situational_modifier"]').val(closestRank);
            html.find('.gear-slider-value').text(closestRank >= 0 ? `+${closestRank}` : `${closestRank}`);
        };

        updateBonusSlider(event);
        $(document).on('pointermove.gearSliderDrag', updateBonusSlider);
        $(document).on('pointerup.gearSliderDrag', () => {
            container.removeClass('active');
            $(document).off('.gearSliderDrag');
        });
    });

    // Sync bonus slider pointer when situational_modifier input changes externally
    const syncBonusSliderToInput = () => {
        const val = parseInt(html.find('input[name="situational_modifier"]').val()) || 0;
        const clamped = Math.max(-4, Math.min(4, val));
        const pointer = html.find('.dialog-gear-section .push-slider-pointer');
        if (pointer.length && bonusPositions[String(clamped)] !== undefined) {
            pointer.css({ 'left': `${bonusPositions[String(clamped)]}%` });
        }
        html.find('.gear-slider-value').text(clamped >= 0 ? `+${clamped}` : `${clamped}`);
    };

    // Watch for external changes to the situational modifier input
    html.find('input[name="situational_modifier"]').on('input change', syncBonusSliderToInput);

    setupRollButtons(html, sheet, content, setVisible, benefitRef);

    html.find('.situation-roll-button').on('click', async (e) => {
        e.preventDefault();
        await executeSituationRoll(html, sheet, content, $(e.currentTarget).data('roll-type'), benefitRef);
        setVisible(false);
    });

    html.find('.dialog-cancel').on('click', (e) => {
        e.preventDefault();
        setVisible(false);
    });
}
