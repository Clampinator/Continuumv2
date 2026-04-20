/*
Initializes the draggable aspect spinners on the gear item sheet.
Each spinner covers values 0-3 with a 35px step.
Viewport is 35px border-box; snap step matches the border-box height.
*/

import { Sound } from './sound-manager.js';

const STEP = 35;
const MIN_VAL = 0;
const MAX_VAL = 3;

function _topForValue(v) {
    return -((MAX_VAL - Math.max(MIN_VAL, Math.min(MAX_VAL, v))) * STEP);
}

function _valueFromTop(top) {
    const idx = Math.round(-top / STEP);
    return Math.max(MIN_VAL, Math.min(MAX_VAL, MAX_VAL - idx));
}

function _initSingleSpinner(viewport, hiddenInput, item, aspectKey) {
    const img = viewport.find('.attribute-spinner-image');
    const initVal = Math.max(MIN_VAL, Math.min(MAX_VAL, Number(hiddenInput.val()) || 0));
    img.css('top', `${_topForValue(initVal)}px`);

    viewport.off('.gearSpinner').on('pointerdown.gearSpinner', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        const startY = e.pageY;
        const startTop = parseInt(img.css('top'), 10);
        img.css('transition', 'none');
        viewport.addClass('active');

        const minTop = _topForValue(MIN_VAL);
        const maxTop = _topForValue(MAX_VAL);
        let lastVal = _valueFromTop(startTop);

        const onMove = (me) => {
            const raw = Math.max(minTop, Math.min(maxTop, startTop + (me.pageY - startY)));
            img.css('top', `${raw}px`);
            const v = _valueFromTop(raw);
            if (v !== lastVal) { Sound.tick(); lastVal = v; }
        };

        const onUp = () => {
            img.css('transition', 'top 0.15s ease-out');
            viewport.removeClass('active');
            $(document).off('.gearSpinnerDrag');

            const newVal = _valueFromTop(parseInt(img.css('top'), 10));
            img.css('top', `${_topForValue(newVal)}px`);
            hiddenInput.val(newVal);

            const currentVal = Number(item.system?.aspects?.[aspectKey]) ?? 0;
            if (newVal !== currentVal) {
                item.update({ [`system.aspects.${aspectKey}`]: newVal });
            }
        };

        $(document).on('pointermove.gearSpinnerDrag', onMove).on('pointerup.gearSpinnerDrag', onUp);
    });
}

export function initializeGearSpinner(html, item) {
    const aspectSpinners = html.find('.attribute-spinner-viewport.gear-aspect-spinner');
    if (aspectSpinners.length) {
        aspectSpinners.each(function () {
            const viewport = $(this);
            const aspectKey = viewport.data('aspect');
            const hiddenInput = viewport.siblings('input[type="hidden"]').filter(`[name="system.aspects.${aspectKey}"]`);
            if (hiddenInput.length) {
                _initSingleSpinner(viewport, hiddenInput, item, aspectKey);
            }
        });
        return;
    }

    const legacySpinner = html.find('.attribute-spinner-viewport.gear-spinner');
    if (!legacySpinner.length) return;

    const hidden = legacySpinner.siblings('input[type="hidden"]');
    const img = legacySpinner.find('.attribute-spinner-image');
    const initVal = Math.max(1, Math.min(10, Number(hidden.val()) || 1));
    img.css('top', `${_topForValue(initVal)}px`);

    const LEGACY_MIN = 1;
    const LEGACY_MAX = 10;
    const legacyTopForValue = (v) => -((LEGACY_MAX - Math.max(LEGACY_MIN, Math.min(LEGACY_MAX, v))) * STEP);
    const legacyValueFromTop = (top) => {
        const idx = Math.round(-top / STEP);
        return Math.max(LEGACY_MIN, Math.min(LEGACY_MAX, LEGACY_MAX - idx));
    };

    legacySpinner.off('.gearSpinner').on('pointerdown.gearSpinner', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        const startY = e.pageY;
        const startTop = parseInt(img.css('top'), 10);
        img.css('transition', 'none');
        legacySpinner.addClass('active');

        const minTop = legacyTopForValue(LEGACY_MIN);
        const maxTop = legacyTopForValue(LEGACY_MAX);
        let lastVal = legacyValueFromTop(startTop);

        const onMove = (me) => {
            const raw = Math.max(minTop, Math.min(maxTop, startTop + (me.pageY - startY)));
            img.css('top', `${raw}px`);
            const v = legacyValueFromTop(raw);
            if (v !== lastVal) { Sound.tick(); lastVal = v; }
        };

        const onUp = () => {
            img.css('transition', 'top 0.15s ease-out');
            legacySpinner.removeClass('active');
            $(document).off('.gearSpinnerDrag');

            const newVal = legacyValueFromTop(parseInt(img.css('top'), 10));
            img.css('top', `${legacyTopForValue(newVal)}px`);
            hidden.val(newVal);

            if (newVal !== (Number(item.system?.bonus) || 0)) {
                item.update({ 'system.bonus': newVal });
            }
        };

        $(document).on('pointermove.gearSpinnerDrag', onMove).on('pointerup.gearSpinnerDrag', onUp);
    });
}