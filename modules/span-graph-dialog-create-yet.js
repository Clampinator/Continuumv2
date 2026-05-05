import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { SECONDS_IN_YEAR } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { parseSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { renderGraph } from './span-graph-render.js';
import { activateDatePickers } from './date-picker.js';
import { Sound } from './sound-manager.js';
import { panToLocation, getMapCenterLocation } from './span-graph-map.js';

/**
 * Dialog to create or edit a "Yet" event.
 *
 * Supports two calling conventions:
 *   NEW (v2 span-graph): showYetDialog({ sheet, svg, viewport, screenPos, existingData, worldAge, worldTime })
 *   LEGACY (lifeline):   showYetDialog(viewState, graphData, sheet, svg, existingData)
 *
 * @param {Object} optionsOrViewState - Configuration object (v2) or legacy viewState
 * @param {Object} [graphData] - Legacy graph data (unused in v2)
 * @param {Object} [sheet] - Legacy ActorSheet
 * @param {Object} [svg] - Legacy SVG element
 * @param {Object} [existingData] - Legacy existing Yet data
 */
export function showYetDialog(optionsOrViewState, graphData, sheet, svg, existingData = null) {
    // Detect legacy positional argument pattern
    let options;
    if (optionsOrViewState && typeof optionsOrViewState === 'object' && !optionsOrViewState.pointerDownX && !optionsOrViewState.interactionMode) {
        // New options object pattern
        options = optionsOrViewState;
    } else {
        // Legacy positional pattern: (viewState, graphData, sheet, svg, existingData)
        options = { viewState: optionsOrViewState, graphData, sheet, svg, existingData };
    }
    const { viewState, graphData: gd, sheet: actorSheet, svg: svgEl, existingData: editData = null, worldAge: precomputedAge, worldTime: precomputedTime, viewport, screenPos } = options;
    const usedSheet = actorSheet || sheet;
    const usedSvg = svgEl || svg;
    const usedExistingData = editData || existingData;
    const isEdit = !!usedExistingData;
    let description = isEdit ? usedExistingData.description : "";
    
    // Calculate defaults from world coordinates (v2 span-graph path)
    // or fall back to legacy pixel-to-world conversion
    let worldAge, worldTime;
    if (precomputedAge !== undefined && precomputedTime !== undefined) {
        worldAge = precomputedAge;
        worldTime = precomputedTime;
    } else if (viewport && screenPos) {
        const worldCoords = viewport.screenToWorld(screenPos.x, screenPos.y);
        worldAge = worldCoords.eventAge;
        worldTime = worldCoords.eventTime;
    } else if (viewState && usedSvg) {
        // Legacy lifeline path: compute from pixel coordinates
        const rect = usedSvg.getBoundingClientRect();
        const pX = viewState.pointerDownX - rect.left;
        const pY = viewState.pointerDownY - rect.top;
        worldAge = (pX - viewState.x) / viewState.scaleX;
        worldTime = (pY - viewState.y) / viewState.scaleY;
    } else {
        worldAge = 0;
        worldTime = Date.now();
    }
    
    let ageStr = "";
    let dateStr = "";
    let timeStr = "";
    let locationStr = isEdit ? usedExistingData.eventLocation || usedExistingData.location || "" : "";
       let lat = isEdit ? (usedExistingData.lat || null) : null;
    let lng = isEdit ? (usedExistingData.lng || null) : null;
    let isFragSuppressed = isEdit ? !!usedExistingData.isFragSuppressed : false;

    const dateObj = new Date(worldTime);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    
    const calculatedDate = `${yyyy}-${mm}-${dd}`;
    const calculatedTime = `${hh}:${min}:${ss}`;

    if (isEdit) {
        if (usedExistingData.age) ageStr = formatSubjectiveAge(parseFloat(usedExistingData.age) * SECONDS_IN_YEAR);
        if (usedExistingData.date) {
            dateStr = usedExistingData.date;
            timeStr = usedExistingData.time || "";
        }
    } else {
        ageStr = formatSubjectiveAge(worldAge);
        dateStr = calculatedDate;
        timeStr = calculatedTime;
    }

    const content = `
        <form>
            <div class="form-group">
                <label>The Yet (Description)</label>
                <input type="text" name="description" value="${description}" autofocus placeholder="What must come to pass?"/>
            </div>
            <div class="form-group" style="margin-top:10px; border-top:1px solid #444; padding-top:5px;">
                <label style="color:#aaa;">Constraints (Optional)</label>
                <p class="eventNotes" style="font-size:0.8em; margin-bottom:5px;">Leave blank to let the event float freely.</p>
            </div>
            <div class="form-group">
                <label>Locked Age</label>
                <div style="display:flex; gap:5px;">
                    <input type="text" name="age" value="${isEdit && usedExistingData.age ? ageStr : ""}" placeholder="${ageStr}" style="flex: 1;"/>
                    <button type="button" class="use-cursor-age" eventTitle="Use Cursor Position" style="flex: 0 0 32px; display: flex; align-items: center; justify-content: center; padding: 0;"><i class="fas fa-crosshairs"></i></button>
                </div>
            </div>
            <div class="form-group">
                <label>Locked Date</label>
                <div class="date-picker-container">
                    <input type="text" class="date-text-input" name="date" value="${isEdit ? dateStr : ""}" placeholder="${dateStr}" />
                    <i class="fas fa-calendar-alt date-picker-icon"></i>
                    <input type="date" class="date-picker-hidden" tabindex="-1" />
                </div>
            </div>
            <div class="form-group">
                <label>Locked Time</label>
                <input type="time" name="time" step="1" value="${isEdit ? timeStr : ""}"/>
            </div>
            <div class="form-group">
                <label>Locked Location</label>
                <div style="display: flex; gap: 5px; align-items: center; width: 100%;">
                    <input type="text" name="location" value="${locationStr || ''}" placeholder="Enter location..." style="flex: 1;">
                    <input type="hidden" name="lat" value="${lat || ''}"/>
                    <input type="hidden" name="lng" value="${lng || ''}"/>
                    <button type="button" class="locate-btn" eventTitle="Locate on Map" style="flex: 0 0 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #333; border: 1px solid #555; border-radius: 4px; color: #8ecae6; cursor: pointer;"><i class="fas fa-map-marker-alt"></i></button>
                    <button type="button" class="grab-btn" eventTitle="Grab Map Center" style="flex: 0 0 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #333; border: 1px solid #555; border-radius: 4px; color: #8ecae6; cursor: pointer;"><i class="fas fa-crosshairs"></i></button>
                </div>
            </div>
            ${isEdit ? `
            <div class="form-group" style="margin-top:10px; border-top:1px solid #444; padding-top:10px; display: flex; align-items: center;">
                <input type="checkbox" name="isFragSuppressed" id="fragSupCheck" ${isFragSuppressed ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                <label for="fragSupCheck" style="margin-bottom:0; color: #ff9f43; cursor: pointer;">Suppress Frag (GM Workaround)</label>
            </div>
            ` : ''}
        </form>
    `;

    new Dialog({
        title: isEdit ? "Edit Yet" : "Define Yet",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text']").on("focus", event => event.currentTarget.select());
            
            // ENTER on location input triggers Locate button
            html.on('keydown', 'input[name="location"]', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    const locateBtn = $(event.currentTarget).siblings('.locate-btn');
                    if (locateBtn.length) locateBtn.click();
                }
            });

            html.find('.use-cursor-age').on('click', () => {
                html.find('input[name="age"]').val(ageStr);
            });

            html.find('.locate-btn').on('click', async (event) => {
                const button = $(event.currentTarget);
                const input = button.siblings('input[name="location"]');
                const latInput = button.siblings('input[name="lat"]');
                const lngInput = button.siblings('input[name="lng"]');
                if (input.val()) {
                    const result = await panToLocation(input.val());
                    if (result) {
                        latInput.val(result.lat);
                        lngInput.val(result.lng);
                        if(result.formattedAddress) input.val(result.formattedAddress);
                    }
                }
            });

            html.find('.grab-btn').on('click', async (event) => {
                const button = $(event.currentTarget);
                const input = button.siblings('input[name="location"]');
                const latInput = button.siblings('input[name="lat"]');
                const lngInput = button.siblings('input[name="lng"]');
                const result = await getMapCenterLocation();
                if (result) {
                    latInput.val(result.lat);
                    lngInput.val(result.lng);
                    input.val(result.formattedAddress);
                }
            });
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const id = isEdit ? usedExistingData.id : foundry.utils.randomID();
                    
                    const updates = {
                        [`system.theYet.${id}.description`]: formData.description,
                        [`system.theYet.${id}.isFragSuppressed`]: formData.isFragSuppressed || false,
                        [`system.theYet.${id}.location`]: formData.location,
                        [`system.theYet.${id}.lat`]: formData.lat,
                        [`system.theYet.${id}.lng`]: formData.lng
                    };
                    
                    if (formData.age && formData.age.trim() !== "") {
                        const seconds = parseSubjectiveAge(formData.age);
                        updates[`system.theYet.${id}.age`] = (seconds / SECONDS_IN_YEAR).toFixed(4);
                    } else {
                        updates[`system.theYet.${id}.age`] = null;
                    }

                    if (formData.date && formData.date.trim() !== "") {
                        updates[`system.theYet.${id}.date`] = normalizeDateInput(formData.date);
                        updates[`system.theYet.${id}.time`] = formData.time;
                    } else {
                        updates[`system.theYet.${id}.date`] = null;
                        updates[`system.theYet.${id}.time`] = null;
                    }
                    
                    if (!isEdit) {
                        updates[`system.theYet.${id}.done`] = false;
                        updates[`system.theYet.${id}.frag`] = 0;
                    }

                    await usedSheet.actor.update(updates);
                    Sound.confirm();
                    if (viewport) {
                        viewport._render();
                    } else {
                        viewState.interactionMode = 'pan';
                        renderGraph(svg, viewState, graphData);
                    }
                }
            },
            ...(isEdit ? {
                delete: {
                    label: "Delete",
                    icon: '<i class="fas fa-trash"></i>',
                    callback: async () => {
                        await usedSheet.actor.update({ [`system.theYet.-=${usedExistingData.id}`]: null });
                        Sound.delete();
                        if (viewport) {
                            viewport._render();
                        } else {
                            viewState.interactionMode = 'pan';
                            renderGraph(svg, viewState, graphData);
                        }
                    }
                }
            } : {
            }),
            cancel: {
                label: "Cancel",
                callback: () => {
                    if (viewport) {
                        viewport._render();
                    } else {
                        viewState.interactionMode = 'pan';
                        renderGraph(svg, viewState, graphData);
                    }
                }
            }
        },
        default: "save",
        close: () => {
            if (viewState && viewState.interactionMode === 'create-yet') {
                viewState.interactionMode = 'pan';
            }
            if (viewport) {
                viewport._render();
            } else if (viewState) {
                renderGraph(svg, viewState, graphData);
            }
        }
    }, { classes: ["continuum-v2", "dialog"], width: "auto", height: "auto" }).render(true);
}
