/*
Initializes compact drag spinners for metability application rows:
  - Ingredient spinners: 0-5 range using the metability sprite at 36px viewport.
  - Level spinner: 1-3 range using the attribute sprite at 36px viewport.

Snap offsets are scaled from the canonical 80px metability offsets and 80px
attribute frame-height. On pointer-up values are persisted to the actor.
Volume display is updated live on ingredient snap changes.
*/

import { Sound } from '../sound-manager.js';
import { updateVolumeDisplay } from './handle-app-ingredient-change.js';

const ING_H = 30; // ingredient spinner viewport height (36x30 = 6:5 matches frame aspect ratio)
const VP = 36;    // level spinner viewport height
const BO = 0;     // base offset (pixel alignment)

// Metability sprite has 6 perfectly equal frames, so offsets are uniform ING_H steps.
const ING_OFFSETS = [0, -1, -2, -3, -4, -5].map(i => i * ING_H + BO);

// Attribute sprite at 36px viewport: frame i starts at -(i * 36) + BO
// Values 1, 2, 3 correspond to attribute frame indices 9, 8, 7.
const LVL_OFFSETS = [
    Math.round(-(9 * VP)) + BO,   // value 1: -322
    Math.round(-(8 * VP)) + BO,   // value 2: -286
    Math.round(-(7 * VP)) + BO    // value 3: -250
];
const LVL_VALUES = [1, 2, 3];

function _closest(offsets, top) {
    let best = 0, bestDist = Infinity;
    offsets.forEach((off, i) => {
        const d = Math.abs(top - off);
        if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
}

// INGREDIENT SPINNERS

function _initIngredients(html, sheet) {
    html.find('.app-ingredient-spinner').each(function() {
        const viewport = $(this);
        const ingredient = viewport.data('appingredient');
        const appId = viewport.data('appid');
        if (!ingredient || !appId) return;
        const val = Math.max(0, Math.min(5, Number(viewport.siblings('.app-ingredient-input').val()) || 0));
        viewport.find('.metability-spinner-image').css('top', `${ING_OFFSETS[val] ?? ING_OFFSETS[0]}px`);
    });

    html.find('.app-ingredient-spinner').off('.appIngSpinner').on('pointerdown.appIngSpinner', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        const viewport = $(e.currentTarget);
        const ingredient = viewport.data('appingredient');
        const appId = viewport.data('appid');
        if (!ingredient || !appId) return;

        const hidden = viewport.siblings('.app-ingredient-input');
        const appItem = viewport.closest('.metability-application-item');
        const img = viewport.find('.metability-spinner-image');

        const startY = e.pageY;
        const startTop = parseInt(img.css('top'), 10);
        img.css('transition', 'none');
        viewport.addClass('active');

        let lastIdx = -1;

        const onMove = (me) => {
            const raw = Math.max(ING_OFFSETS[5], Math.min(ING_OFFSETS[0], startTop + (me.pageY - startY)));
            img.css('top', `${raw}px`);
            const idx = _closest(ING_OFFSETS, raw);
            if (lastIdx !== -1 && idx !== lastIdx) Sound.tick();
            lastIdx = idx;
            hidden.val(idx);
            updateVolumeDisplay(sheet, appItem[0]);
        };

        const onUp = () => {
            img.css('transition', 'top 0.15s ease-out');
            viewport.removeClass('active');
            $(document).off('.appIngDrag');

            let idx = _closest(ING_OFFSETS, parseInt(img.css('top'), 10));

            // Cap 1: per-ingredient metability rank
            const metaRank = Number(sheet.actor.system.metabilities?.[ingredient]?.value) || 0;
            idx = Math.min(idx, metaRank);

            // Cap 2: volume cap
            const analyze = Number(sheet.actor.system?.attributes?.mind?.value) || 0;
            const maxVol = Math.max(0, (analyze * 3) - 6);
            const otherTotal = appItem.find('.app-ingredient-input').toArray()
                .reduce((sum, el) => el === hidden[0] ? sum : sum + (Number($(el).val()) || 0), 0);
            idx = Math.min(idx, Math.max(0, maxVol - otherTotal));

            img.css('top', `${ING_OFFSETS[idx]}px`);
            hidden.val(idx);
            updateVolumeDisplay(sheet, appItem[0]);

            const stored = Number(sheet.actor.system.metabilities?.applications?.[appId]?.[ingredient]) || 0;
            if (idx !== stored) sheet.actor.update({ [`system.metabilities.applications.${appId}.${ingredient}`]: idx });
        };

        $(document).on('pointermove.appIngDrag', onMove).on('pointerup.appIngDrag', onUp);
    });
}

// LEVEL SPINNERS

function _initLevels(html, sheet) {
    html.find('.app-level-spinner').each(function() {
        const viewport = $(this);
        const appId = viewport.data('applevel');
        if (!appId) return;
        const val = Math.max(1, Math.min(3, Number(viewport.siblings('input[type="hidden"]').val()) || 1));
        const idx = LVL_VALUES.indexOf(val);
        viewport.find('.attribute-spinner-image').css('top', `${LVL_OFFSETS[idx >= 0 ? idx : 0]}px`);
    });

    html.find('.app-level-spinner').off('.appLvlSpinner').on('pointerdown.appLvlSpinner', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        const viewport = $(e.currentTarget);
        const appId = viewport.data('applevel');
        if (!appId) return;

        const hidden = viewport.siblings('input[type="hidden"]');
        const img = viewport.find('.attribute-spinner-image');

        const startY = e.pageY;
        const startTop = parseInt(img.css('top'), 10);
        img.css('transition', 'none');
        viewport.addClass('active');

        let lastIdx = -1;

        const onMove = (me) => {
            const raw = Math.max(LVL_OFFSETS[0], Math.min(LVL_OFFSETS[2], startTop + (me.pageY - startY)));
            img.css('top', `${raw}px`);
            const idx = _closest(LVL_OFFSETS, raw);
            if (lastIdx !== -1 && idx !== lastIdx) Sound.tick();
            lastIdx = idx;
        };

        const onUp = () => {
            img.css('transition', 'top 0.15s ease-out');
            viewport.removeClass('active');
            $(document).off('.appLvlDrag');

            const idx = _closest(LVL_OFFSETS, parseInt(img.css('top'), 10));
            const val = LVL_VALUES[idx];
            img.css('top', `${LVL_OFFSETS[idx]}px`);
            hidden.val(val);

            const stored = Number(sheet.actor.system.metabilities?.applications?.[appId]?.level) || 1;
            if (val !== stored) sheet.actor.update({ [`system.metabilities.applications.${appId}.level`]: val });
        };

        $(document).on('pointermove.appLvlDrag', onMove).on('pointerup.appLvlDrag', onUp);
    });
}

export function initializeAppSpinners(html, sheet) {
    _initIngredients(html, sheet);
    _initLevels(html, sheet);
}
