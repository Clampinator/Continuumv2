/*
Validates a metability application ingredient input on change.
Enforces two constraints and provides live feedback:

1. Per-ingredient cap: value cannot exceed the character's metability rank for
   that ingredient type. Attempting to exceed it bounces the spinner back.

2. Volume cap: sum of all five ingredients cannot exceed (Analyze x 3) - 6.
   (At Analyze 4 this is 6 points total.) Attempting to exceed it clamps the
   spinner and briefly highlights the row red until the user backs off.

Call updateVolumeDisplay once on sheet load to populate the initial totals.
*/

const VOLUME_FORMULA = (analyze) => Math.max(0, (analyze * 3) - 6);

function _getAnalyze(actor) {
    return Number(actor.system?.attributes?.mind?.value) || 0;
}

function _getOtherTotal(appItem, excludeEl) {
    let total = 0;
    appItem.find('.app-ingredient-input').each(function() {
        if (this !== excludeEl) total += Number($(this).val()) || 0;
    });
    return total;
}

export function updateVolumeDisplay(sheet, appItemEl) {
    const appItem = $(appItemEl);
    const analyze = _getAnalyze(sheet.actor);
    const maxVolume = VOLUME_FORMULA(analyze);
    let total = 0;
    appItem.find('.app-ingredient-input').each(function() {
        total += Number($(this).val()) || 0;
    });
    appItem.find('.app-volume-used').text(total);
    appItem.find('.app-volume-max').text(maxVolume);
}

export function handleAppIngredientChange(sheet, event) {
    const input = $(event.currentTarget);
    const appItem = input.closest('.metability-application-item');
    const ingredient = input.data('ingredient');

    const analyze = _getAnalyze(sheet.actor);
    const maxVolume = VOLUME_FORMULA(analyze);
    const metaRank = Number(sheet.actor.system.metabilities?.[ingredient]?.value) || 0;

    const rawVal = Math.max(0, Math.min(5, Number(input.val()) || 0));
    let clampedVal = rawVal;

    // Cap 1: cannot exceed the character's metability rank for this type
    clampedVal = Math.min(clampedVal, metaRank);

    // Cap 2: total volume cannot exceed the formula cap
    const otherTotal = _getOtherTotal(appItem, event.currentTarget);
    clampedVal = Math.min(clampedVal, Math.max(0, maxVolume - otherTotal));

    input.val(clampedVal);

    const total = otherTotal + clampedVal;
    appItem.find('.app-volume-used').text(total);
    appItem.find('.app-volume-max').text(maxVolume);

    // Show red while the user is at the limit (i.e., their input was clamped)
    appItem.toggleClass('volume-exceeded', rawVal > clampedVal);
}
