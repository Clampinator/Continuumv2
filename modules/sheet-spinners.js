
// continuum/modules/sheet-spinners.js
import { Sound } from './sound-manager.js';
import { clampTempToPerm } from '/systems/continuum-v2/modules/temporal-kernel/clamp-temp-to-perm.js';
import { clampValueToPotential } from '/systems/continuum-v2/modules/temporal-kernel/clamp-value-to-potential.js';

/**
 * Initializes all interactive spinners on the sheet.
 * Handles dragging for Attributes, Willpower, Wounds, Spanning, and Metabilities.
 * @param {JQuery} html The sheet HTML.
 * @param {ActorSheet} sheet The actor sheet instance.
 */
export function initializeSpinners(html, sheet) {
    const attrSpinnerViewports = html.find('.attribute-spinner-viewport, .metability-spinner-viewport');

    // --- PIXEL PERFECT NORMALIZATION ---
    // Single source of truth for vertical alignment. 
    const isFoundryApp = navigator.userAgent.includes("FoundryVTT/");
    const BASE_OFFSET = isFoundryApp ? 5 : 5;

    // Metability uses a specific set of offsets from the image strip.
    const metabilitySnapOffsets = [ 0, -80, -160, -240, -320, -400 ];

    // Use exact frame heights for steps: 80px (Standard), 50px (Compact), 34px (Wounds)
    const regularAttrSnapOffsets = Array.from({ length: 11 }, (_, i) => Math.round((-i * 80) + BASE_OFFSET));
    const compactAttrSnapOffsets  = Array.from({ length: 11 }, (_, i) => Math.round((-i * 50) + BASE_OFFSET));
    const woundSnapOffsets       = Array.from({ length: 11 }, (_, i) => Math.round((-i * 34) + BASE_OFFSET));

    // Rep spinners: measure the actual rendered viewport height at runtime so the frame size is
    // always exact — immune to border-box adjustments, CSS load order, or any sizing guesswork.
    // clientHeight = inner height (content + padding, no border) = what height:1100% resolves against.
    const repSampleViewport = html.find('.attribute-column-dual .attribute-spinner-viewport')[0];
    const REP_FRAME_PX = repSampleViewport ? repSampleViewport.clientHeight : 40;

    // Vertical alignment: 0 = pixel-perfect frame alignment. Positive shifts digit down, negative shifts up.
    // ↓ Only tweak this if ALL rep digits look uniformly too high or too low after the auto-measure.
    const REP_BASE_OFFSET = 0;
    const repSnapOffsets = Array.from({ length: 11 }, (_, i) => Math.round((-i * REP_FRAME_PX) + REP_BASE_OFFSET));

    // --- 1. Initialize Positions ---
    attrSpinnerViewports.each(function() {
        const viewport = $(this);
        let attributeName = viewport.data('attribute');
        const metabilityName = viewport.data('metability');
        
        let snapOffsets = regularAttrSnapOffsets;
        let value = 0;

        if (metabilityName) {
            attributeName = metabilityName;
            snapOffsets = metabilitySnapOffsets;
            value = Number(sheet.actor.system.metabilities[metabilityName]?.value) || 0;
        } else if (attributeName) {
            const isRepMini = ['internalReputationTemp','internalReputationPerm','externalReputationTemp','externalReputationPerm'].includes(attributeName);
            const isCompact = attributeName.includes('willpower');
            const isWound = attributeName.startsWith('wound-');

            if (isRepMini) snapOffsets = repSnapOffsets;
            else if (isCompact) snapOffsets = compactAttrSnapOffsets;
            else if (isWound) snapOffsets = woundSnapOffsets;

            if (attributeName === 'willpowerTemp') {
                value = Number(sheet.actor.system.attributes.willpower.temp) || 0;
            } else if (attributeName === 'willpowerPerm') {
                value = Number(sheet.actor.system.attributes.willpower.perm) || 0;
            } else if (attributeName === 'internalReputationTemp') {
                value = Number(sheet.actor.system.attributes.internalReputation?.temp) || 0;
            } else if (attributeName === 'internalReputationPerm') {
                value = Number(sheet.actor.system.attributes.internalReputation?.perm) || 0;
            } else if (attributeName === 'externalReputationTemp') {
                value = Number(sheet.actor.system.attributes.externalReputation?.temp) || 0;
            } else if (attributeName === 'externalReputationPerm') {
                value = Number(sheet.actor.system.attributes.externalReputation?.perm) || 0;
            } else if (['span', 'naturalSpan', 'deliberateFrag', 'naturalFrag'].includes(attributeName)) {
                value = Number(sheet.actor.system.spanning[attributeName]) || 0;
            } else if (isWound) {
                const key = attributeName.split('-')[1];
                value = Number(sheet.actor.system.combat.wounds[key]?.ip) || 0;
            } else {
                value = Number(foundry.utils.getProperty(sheet.actor.system, `attributes.${attributeName}.value`)) || 0;
            }
        } else {
            return;
        }
        
        let initialTop = 0;
        if (metabilityName) {
            initialTop = snapOffsets[value] ?? snapOffsets[0];
        } else {
            const snapIndex = 10 - value;
            initialTop = snapOffsets[snapIndex] ?? snapOffsets[10];
        }
        
        viewport.find('.attribute-spinner-image, .metability-spinner-image').css('top', `${initialTop}px`);
    });

    // --- 2. Attach Listeners ---
    attrSpinnerViewports.off('.continuumSpinner').on('pointerdown.continuumSpinner', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();

        const viewport = $(event.currentTarget);
        let attributeName = viewport.data('attribute');
        const metabilityName = viewport.data('metability');
        
        const image = viewport.find('.attribute-spinner-image, .metability-spinner-image');
        
        let snapOffsets = regularAttrSnapOffsets;
        let isMetability = false;

        if (metabilityName) {
            attributeName = metabilityName;
            snapOffsets = metabilitySnapOffsets;
            isMetability = true;
        } else if (attributeName) {
            const isRepMini = ['internalReputationTemp','internalReputationPerm','externalReputationTemp','externalReputationPerm'].includes(attributeName);
            const isCompact = attributeName.includes('willpower');
            const isWound = attributeName.startsWith('wound-');
            if (isRepMini) { snapOffsets = repSnapOffsets; viewport._repMini = true; }
            else if (isCompact) snapOffsets = compactAttrSnapOffsets;
            else if (isWound) snapOffsets = woundSnapOffsets;
        } else {
            return;
        }

        const isRepMiniDrag = viewport._repMini === true;
        const maxTop = snapOffsets[snapOffsets.length - 1];
        const startY = event.pageY;
        const startTop = parseInt(image.css('top'), 10);
        
        image.css('transition', 'none');
        viewport.addClass('active');

        let minClamp = snapOffsets[0]; 
        let maxClamp = maxTop;         

        if (['span', 'naturalSpan'].includes(attributeName)) {
            minClamp = snapOffsets[5];
        }

        let lastSnapIndex = -1;

        const onPointerMove = (moveEvent) => {
            const deltaY = moveEvent.pageY - startY;
            let newTop = startTop + deltaY;
            
            if (isMetability) {
                 newTop = Math.max(maxTop, Math.min(BASE_OFFSET, newTop));
            } else {
                 newTop = Math.max(maxClamp, Math.min(minClamp, newTop));
            }
            
            image.css('top', `${newTop}px`);

            let currentSnapIndex = 0;
            let minDistance = Infinity;
            snapOffsets.forEach((offset, index) => {
                const distance = Math.abs(newTop - offset);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentSnapIndex = index;
                }
            });

            if (lastSnapIndex !== -1 && currentSnapIndex !== lastSnapIndex) {
                Sound.tick();
            }
            lastSnapIndex = currentSnapIndex;
        
            if (attributeName === 'willpowerPerm') {
                const newPermValue = 10 - currentSnapIndex;
                const currentTempWill = sheet.actor.system.attributes.willpower.temp || 0;
                const clampedTemp = clampTempToPerm(currentTempWill, newPermValue);
                if (clampedTemp < currentTempWill) {
                    const tempIdx = 10 - clampedTemp;
                    const tempWillSpinnerImage = html.find('.attribute-spinner-viewport[data-attribute="willpowerTemp"] .attribute-spinner-image');
                    if (tempWillSpinnerImage.length) {
                        tempWillSpinnerImage.css('top', `${snapOffsets[tempIdx]}px`);
                    }
                }
            }
            if (attributeName === 'internalReputationPerm') {
                const newPermValue = 10 - currentSnapIndex;
                const currentTemp = sheet.actor.system.attributes.internalReputation?.temp || 0;
                const clampedTemp = clampTempToPerm(currentTemp, newPermValue);
                if (clampedTemp < currentTemp) {
                    const tempIdx = 10 - clampedTemp;
                    const tempImg = html.find('.attribute-spinner-viewport[data-attribute="internalReputationTemp"] .attribute-spinner-image');
                    if (tempImg.length) tempImg.css('top', `${snapOffsets[tempIdx]}px`);
                }
            }
            if (attributeName === 'externalReputationPerm') {
                const newPermValue = 10 - currentSnapIndex;
                const currentTemp = sheet.actor.system.attributes.externalReputation?.temp || 0;
                const clampedTemp = clampTempToPerm(currentTemp, newPermValue);
                if (clampedTemp < currentTemp) {
                    const tempIdx = 10 - clampedTemp;
                    const tempImg = html.find('.attribute-spinner-viewport[data-attribute="externalReputationTemp"] .attribute-spinner-image');
                    if (tempImg.length) tempImg.css('top', `${snapOffsets[tempIdx]}px`);
                }
            }
        };

        const onPointerUp = () => {
            image.css('transition', 'top 0.15s ease-out');
            viewport.removeClass('active');
            $(document).off('.spinnerDrag');

            // Derived attributes (force/intel/influence/comms on org sheets) are
            // read-only — snap back to display value and skip the actor update.
            if (!isMetability && viewport.data('derived')) {
                const derivedVal = Number(viewport.siblings('.derived-attr-input').val())
                    || Number(viewport.closest('.attribute-block').find('.derived-attr-input').val()) || 0;
                const snapIdx = 10 - Math.max(0, Math.min(10, derivedVal));
                image.css('top', `${snapOffsets[snapIdx] ?? snapOffsets[10]}px`);
                return;
            }
        
            const finalTop = parseInt(image.css('top'), 10);
            let closestSnapIndex = 0;
            let minDistance = Infinity;
            snapOffsets.forEach((offset, index) => {
                const distance = Math.abs(finalTop - offset);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSnapIndex = index;
                }
            });
            
            let newValue = isMetability ? closestSnapIndex : (10 - closestSnapIndex);

            if (attributeName === 'willpowerTemp') {
                const permWill = sheet.actor.system.attributes.willpower.perm || 0;
                const clamped = clampTempToPerm(newValue, permWill);
                if (clamped !== newValue) {
                    newValue = clamped;
                    closestSnapIndex = 10 - newValue;
                }
            }
            if (attributeName === 'internalReputationTemp') {
                const permIR = sheet.actor.system.attributes.internalReputation?.perm || 0;
                const clamped = clampTempToPerm(newValue, permIR);
                if (clamped !== newValue) { newValue = clamped; closestSnapIndex = 10 - newValue; }
            }
            if (attributeName === 'externalReputationTemp') {
                const permER = sheet.actor.system.attributes.externalReputation?.perm || 0;
                const clamped = clampTempToPerm(newValue, permER);
                if (clamped !== newValue) { newValue = clamped; closestSnapIndex = 10 - newValue; }
            }

            const snapTop = snapOffsets[closestSnapIndex];
            image.css('top', `${snapTop}px`);

            let updatePath;
            if (isMetability) {
                // Check operant potential cap
                const potential = sheet.actor.system.metabilities[attributeName]?.potential ?? 5;
                const clampedValue = clampValueToPotential(newValue, potential);
                if (clampedValue !== newValue) {
                    newValue = clampedValue;
                    closestSnapIndex = newValue;
                    image.css('top', `${snapOffsets[closestSnapIndex]}px`);
                }
                
                updatePath = `system.metabilities.${attributeName}.value`;
                const frame = viewport.closest('.metability-potential-frame');
                const rollButton = frame.find(`.roll-attribute[data-attribute="meta-${attributeName}"]`);
                rollButton.prop('disabled', newValue === 0);
                
                // Update at-potential state
                updateAtPotentialState(frame, sheet);
            } else if (attributeName === 'willpowerTemp') {
                updatePath = 'system.attributes.willpower.temp';
            } else if (attributeName === 'willpowerPerm') {
                updatePath = 'system.attributes.willpower.perm';
            } else if (attributeName === 'internalReputationTemp') {
                updatePath = 'system.attributes.internalReputation.temp';
            } else if (attributeName === 'internalReputationPerm') {
                updatePath = 'system.attributes.internalReputation.perm';
                const curTempIR = sheet.actor.system.attributes.internalReputation?.temp || 0;
                const clampedTemp = clampTempToPerm(curTempIR, newValue);
                if (clampedTemp !== curTempIR) sheet.actor.update({ 'system.attributes.internalReputation.temp': clampedTemp });
            } else if (attributeName === 'externalReputationTemp') {
                updatePath = 'system.attributes.externalReputation.temp';
            } else if (attributeName === 'externalReputationPerm') {
                updatePath = 'system.attributes.externalReputation.perm';
                const curTempER = sheet.actor.system.attributes.externalReputation?.temp || 0;
                const clampedTemp = clampTempToPerm(curTempER, newValue);
                if (clampedTemp !== curTempER) sheet.actor.update({ 'system.attributes.externalReputation.temp': clampedTemp });
            } else if (['span', 'naturalSpan', 'deliberateFrag', 'naturalFrag'].includes(attributeName)) {
                updatePath = `system.spanning.${attributeName}`;
            } else if (attributeName.startsWith('wound-')) {
                const key = attributeName.split('-')[1];
                updatePath = `system.combat.wounds.${key}.ip`;
            } else {
                updatePath = `system.attributes.${attributeName}.value`;
            }
            
            const oldValue = Number(foundry.utils.getProperty(sheet.actor.system, updatePath));
        
            if (newValue !== oldValue) {
                sheet.actor.update({ [updatePath]: newValue });
            }
        };

        $(document).on('pointermove.spinnerDrag', onPointerMove);
        $(document).on('pointerup.spinnerDrag', onPointerUp);
    });

    // --- 3. Initialize Operant Potential Borders ---
    initializeOperantPotentials(html, sheet, metabilitySnapOffsets, BASE_OFFSET);
}

/**
 * Initialize Operant Potential backgrounds and border drag handlers
 */
function initializeOperantPotentials(html, sheet, metabilitySnapOffsets, baseOffset) {
    const potentialFrames = html.find('.metability-potential-frame');
    
    // Offsets for the potential background image (143px per frame - 120x858px image)
    const potentialBgOffsets = [ 0, -143, -286, -429, -572, -715 ];
    
    // Initialize background positions for all potential frames
    potentialFrames.each(function() {
        const frame = $(this);
        const metability = frame.data('metability');
        const potential = sheet.actor.system.metabilities[metability]?.potential ?? 0;
        
        // Set background image position to show the potential level
        const bgImage = frame.find('.potential-bg-image');
        const offset = potentialBgOffsets[potential] ?? 0;
        bgImage.css('top', `${offset}px`);
        
        // Update at-potential state
        updateAtPotentialState(frame, sheet);
    });
    
    // Check if potentials are locked - when locked, no one can change them
    const isLocked = sheet.actor.system.metabilities.potentialsLocked ?? false;
    
    if (!isLocked) {
        attachPotentialBorderHandlers(html, sheet, potentialBgOffsets, baseOffset);
    }
}

/**
 * Update visual state when current value equals potential
 */
function updateAtPotentialState(frame, sheet) {
    const metability = frame.data('metability');
    const current = sheet.actor.system.metabilities[metability]?.value ?? 0;
    const potential = sheet.actor.system.metabilities[metability]?.potential ?? 0;
    
    if (current >= potential) {
        frame.addClass('at-potential');
    } else {
        frame.removeClass('at-potential');
    }
}

/**
 * Attach drag handlers to operant potential borders
 */
function attachPotentialBorderHandlers(html, sheet, potentialBgOffsets, baseOffset) {
    html.find('.potential-background').off('.potentialDrag')
        .on('pointerdown.potentialDrag', function(event) {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            
            const bgContainer = $(this);
            const frame = bgContainer.closest('.metability-potential-frame');
            const metability = frame.data('metability');
            const bgImage = frame.find('.potential-bg-image');
            
            const startY = event.pageY;
            const startTop = parseInt(bgImage.css('top'), 10);
            
            bgImage.css('transition', 'none');
            bgContainer.addClass('dragging');
            
            let lastSnapIndex = -1;
            
            const onPointerMove = (moveEvent) => {
                const deltaY = moveEvent.pageY - startY;
                let newTop = startTop + deltaY;
                
                // Clamp to valid range (0-5)
                newTop = Math.max(potentialBgOffsets[5], Math.min(potentialBgOffsets[0], newTop));
                bgImage.css('top', `${newTop}px`);
                
                // Find closest snap for sound feedback
                let currentSnapIndex = 0;
                let minDistance = Infinity;
                potentialBgOffsets.forEach((offset, index) => {
                    const distance = Math.abs(newTop - offset);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentSnapIndex = index;
                    }
                });
                
                if (lastSnapIndex !== -1 && currentSnapIndex !== lastSnapIndex) {
                    Sound.tick();
                }
                lastSnapIndex = currentSnapIndex;
            };
            
            const onPointerUp = () => {
bgImage.css('transition', 'top 0.15s ease-out');
            bgContainer.removeClass('dragging');
            $(document).off('.potentialDrag');
                
                // Get final position and find closest snap
                const finalTop = parseInt(bgImage.css('top'), 10);
                let closestIndex = 0;
                let minDistance = Infinity;
                
                potentialBgOffsets.forEach((offset, index) => {
                    const distance = Math.abs(finalTop - offset);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                });
                
                // Snap to position
                bgImage.css('top', `${potentialBgOffsets[closestIndex]}px`);
                
                // Save if changed
                const oldPotential = sheet.actor.system.metabilities[metability]?.potential ?? 0;
                if (closestIndex !== oldPotential) {
                    // Update potential
                    sheet.actor.update({
                        [`system.metabilities.${metability}.potential`]: closestIndex
                    });
                    
                    // If current value exceeds new potential, cap it
                    const currentValue = sheet.actor.system.metabilities[metability]?.value ?? 0;
                    const clampedValue = clampValueToPotential(currentValue, closestIndex);
                    if (clampedValue !== currentValue) {
                        sheet.actor.update({
                            [`system.metabilities.${metability}.value`]: clampedValue
                        });
                        
                        // Update main spinner visual (uses different offsets)
                        const mainSpinner = frame.find('.metability-spinner-image');
                        const metabilitySnapOffsets = [ 0, -80, -160, -240, -320, -400 ];
                        mainSpinner.css('top', `${metabilitySnapOffsets[clampedValue]}px`);
                        
                        // Disable roll button if now at 0
                        if (clampedValue === 0) {
                            frame.find('.roll-attribute').prop('disabled', true);
                        }
                    }
                    
                    // Update at-potential state
                    updateAtPotentialState(frame, sheet);
                }
            };
            
            $(document).on('pointermove.potentialDrag', onPointerMove);
            $(document).on('pointerup.potentialDrag', onPointerUp);
        });
}
