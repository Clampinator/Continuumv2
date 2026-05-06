import { getTemplateData } from './get-template-data.js';
import { handleSubmit } from '../event-dialog/handle-submit.js';
import { activateDatePickers } from '/systems/continuum-v2/modules/date-picker.js';
import { panToLocation, getMapCenterLocation } from '/systems/continuum-v2/modules/span-graph-map.js';
import { getSheetContext } from '/systems/continuum-v2/modules/span-graph-state.js';
import { buildPreviewHistory } from '/systems/continuum-v2/modules/temporal-engine/build-preview-history.js';
import { solveHistoryPhysics } from '/systems/continuum-v2/modules/temporal-kernel/solve-history-physics.js';
import { calculateInsertionDisplacement } from '/systems/continuum-v2/modules/temporal-kernel/calculate-insertion-displacement.js';
import { computeSplicePoint } from '/systems/continuum-v2/modules/state/compute-splice-point.js';
import { getActorHistory } from '/systems/continuum-v2/modules/state/get-actor-history.js';
import { timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { parseObjectiveTime } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '/systems/continuum-v2/modules/temporal-translator/location-resolver.js';

/**
 * REBUILT: Exact functional replica of legacy openEventDialog, 
 * but hard-coded for the "Log Span Result" context.
 */
export async function openSpanDialog(sheet, params) {
    const context = getSheetContext(sheet);
    const viewState = context.viewState;
    const graphData = params.graphData || context.graphData;
    
    if (viewState.interactionMode === 'dialog-open') return;
    
    viewState.interactionMode = 'dialog-open';

    let confirmed = false;
    const actor = sheet.actor;
    // AUTHORITY: Explicitly map arrival coordinates to ageRaw/timeRaw for getTemplateData
    const templateData = getTemplateData(actor, { 
        ...params, 
        mode: 'log',
        ageRaw: params.arrival.eventAge,
        timeRaw: params.arrival.eventTime,
        departure: params.departure,
        viewState, 
        graphData, 
        eventIsSpan: true 
    });

    // DOWNSTREAM IMPACT PREVIEW: Compute which events shift and by how much
    // when this span is inserted. Shows the user the consequences before committing.
    const downstreamImpact = _computeDownstreamImpact(actor, params);
    if (downstreamImpact.length > 0) {
        templateData.downstreamImpact = downstreamImpact;
    }

    // Exact legacy eventTitle logic
    const dialogTitle = "Log Span Result";

    // Use the exact legacy-matched template with V13 API
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/continuum-v2/templates/dialogs/span-result-dialog.html", 
        templateData
    );

    const buttons = {
        save: {
            label: "Commit to Lifeline",
            icon: '<i class="fas fa-save"></i>',
            callback: async (html) => {
                confirmed = true;
                const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                await handleSubmit(actor, formData, {
                    ...params,
                    ...templateData,
                    viewState,
                    graphData
                });
            }
        },
        cancel: { 
            label: "Cancel",
            callback: () => {
                confirmed = false;
            }
        }
    };

    const dialog = new Dialog({
        eventTitle: dialogTitle,
        content: content,
        render: (html) => {
            activateDatePickers(html);
            
            const contextList = html.find('.context-list-scroll');
            
            // --- REPLICATED: HANDOVER WORKFLOW ---
            const handleHandoverAutomation = (isChecked) => {
                if (!isChecked) return;
                const selectedAction = contextList.find('input[name="experienceAction"]:checked').val();
                if (selectedAction && selectedAction.startsWith('move:')) {
                    const parts = selectedAction.split(':');
                    const currentExpId = parts[2];
                    if (currentExpId && currentExpId !== 'null' && currentExpId !== 'undefined') {
                        const closeCheckbox = contextList.find(`#ce-${currentExpId}`);
                        if (closeCheckbox.length && !closeCheckbox.is(':checked')) {
                            closeCheckbox.prop('checked', true).trigger('change');
                            ui.notifications.info("Handover Suggested: Closing current experience.");
                        }
                    }
                }
            };

            const updateNewExpVisibility = () => {
                const startNewCheckbox = contextList.find('input[name="startNewExp"]');
                const isNewChecked = startNewCheckbox.is(':checked');
                if (isNewChecked) {
                    html.find('#newExpGroup').show();
                    handleHandoverAutomation(true);
                } else {
                    html.find('#newExpGroup').hide();
                }
                dialog.setPosition({ height: "auto" });
            };

            // --- REPLICATED: LINE CLICK TOGGLING ---
            contextList.find('.context-item').on('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
                const $item = $(e.currentTarget);
                const $radio = $item.find('input[type="radio"]');
                const $checkbox = $item.find('input[type="checkbox"]');
                if ($radio.length) {
                    $radio.prop('checked', true).trigger('change');
                } else if ($checkbox.length) {
                    $checkbox.prop('checked', !$checkbox.is(':checked')).trigger('change');
                }
            });

            contextList.find('input').on('change', updateNewExpVisibility);
            updateNewExpVisibility();

            // --- REPLICATED: SPAN TOGGLE (Locked ON for this dialog) ---
            const spanToggle = html.find('input[name="eventIsSpan"]');
            const restCheckbox = html.find('input[name="eventIsRest"]');
            const spanFields = html.find('#spanFields');
            const eventFields = html.find('#eventFields');

            // Force visibility to Span mode
            spanFields.show();
            eventFields.hide();
            restCheckbox.prop('disabled', true);

            spanToggle.on('change', () => {
                const isChecked = spanToggle.is(':checked');
                if (isChecked) {
                    spanFields.show();
                    eventFields.hide();
                    restCheckbox.prop('checked', false).prop('disabled', true);
                } else {
                    spanFields.hide();
                    eventFields.show();
                    restCheckbox.prop('disabled', false);
                }
                dialog.setPosition({ height: "auto" });
            });

            // --- ENTER on location inputs triggers Locate button ---
            html.on('keydown', '.input-with-btn input[type="text"]', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    const container = $(event.currentTarget).closest('.input-with-btn');
                    const locateBtn = container.find('.locate-btn');
                    if (locateBtn.length) locateBtn.click();
                }
            });

            // --- REPLICATED: MAP INTEGRATION ---
            html.find('.locate-btn, .grab-btn').on('click', async (e) => {
                const btn = $(e.currentTarget);
                const isGrab = btn.hasClass('grab-btn');
                const container = btn.closest('.input-with-btn');
                const input = container.find('input[type="text"]');
                const latIn = container.find('input[type="hidden"][name*="Lat"]');
                const lngIn = container.find('input[type="hidden"][name*="Lng"]');
                const zoomIn = container.find('input[type="hidden"][name*="Zoom"]');
                
                btn.find('i').attr('class', 'fas fa-spinner fa-spin');
                const result = isGrab ? await getMapCenterLocation() : await panToLocation(input.val());
                btn.find('i').attr('class', isGrab ? 'fas fa-crosshairs' : 'fas fa-map-marker-alt');
                
                if (result) {
                    latIn.val(result.lat); 
                    lngIn.val(result.lng);
                    zoomIn.val(result.zoom || 12);
                    if (result.formattedAddress) input.val(result.formattedAddress);
                }
            });
        },
        buttons: buttons,
        default: "save",
        close: () => {
            // Revert NOW node position only on cancel
            if (!confirmed && params.mode === 'log' && viewState.dragStartWorld) {
                if (graphData.nowNode) {
                    graphData.nowNode.eventAge = viewState.dragStartWorld.eventAge;
                    graphData.nowNode.eventTime = viewState.dragStartWorld.eventTime;
                }
            }

            viewState.interactionMode = 'pan';
            viewState.isCommittingLog = false;

            // Safe re-render: only if sheet is still active
            if (sheet.rendered) {
                const viewport = sheet._spanGraphViewport;
                if (viewport) viewport.updateActor(actor);
            }
        }
    }, { classes: ["continuum-v2", "dialog"], width: 480 });

    dialog.render(true);
}

/**
 * Computes the downstream impact of inserting a span at the given coordinates.
 * Uses buildPreviewHistory to create a virtual history with the span injected,
 * then solveHistoryPhysics to compute age shifts for downstream events.
 * Returns an array of { title, oldDate, newDate, shift } for events that shift.
 *
 * @param {Actor} actor
 * @param {Object} params - Must have departure and arrival with eventAge/eventTime
 * @returns {Array<{title, oldDate, newDate, shift}>}
 */
function _computeDownstreamImpact(actor, params) {
    if (!params.departure || !params.arrival) return [];

    const history = getActorHistory(actor);
    const dob = actor.system.personal?.dob || '1970-01-01';
    const birthCtx = resolveLocationContext([], 0, actor);
    const originTime = parseObjectiveTime(dob, '12:00:00', birthCtx);

    // Compute insertion context (where the span splices into the timeline)
    // computeSplicePoint takes (snapWorld, physicalNodes, originTime)
    // physicalNodes = history with physics coordinates applied
    const physicsShiftsOriginal = solveHistoryPhysics(history, originTime);
    const physicalNodes = history.map(n => ({
        ...n,
        x: Number(n.record?.eventAge || physicsShiftsOriginal[n.id] || n.x || 0),
        y: Number(n.record?.ts || n.y || 0)
    }));

    const splicePoint = computeSplicePoint(
        { eventAge: params.departure.eventAge, eventTime: params.departure.eventTime },
        physicalNodes,
        originTime
    );
    if (!splicePoint) return [];

    // Compute displacement (how far the span jumps in objective time)
    const displacementResult = calculateInsertionDisplacement(
        params.departure.eventAge,
        params.departure.eventTime,
        params.arrival.eventTime,
        physicalNodes
    );
    if (!displacementResult) return [];

    // Build virtual history with the span injected
    const previewHistory = buildPreviewHistory(history, splicePoint, displacementResult);
    if (!previewHistory || previewHistory.length === 0) return [];

    // Run compensation wave to get age shifts
    const previewShifts = solveHistoryPhysics(previewHistory, originTime);

    // Format shifted events for display
    const shifts = [];
    for (const [id, newAge] of Object.entries(previewShifts)) {
        if (id === 'preview-insert-span') continue;
        const node = history.find(n => n.id === id);
        if (!node) continue;

        const oldAge = Number(node.record?.eventAge || node.x || 0);
        const ageDiff = newAge - oldAge;
        // Only show shifts greater than 1 second (rounded)
        if (Math.abs(ageDiff) < 1) continue;

        const oldTs = Number(node.record?.ts || node.y || 0);
        const newTs = oldTs + displacementResult.displacement;

        const oldDate = timestampToDateString(oldTs);
        const newDate = timestampToDateString(newTs);

        // Human-readable shift
        const absDiff = Math.abs(ageDiff);
        const shiftStr = absDiff >= 31536000
            ? `+${(absDiff / 31536000).toFixed(1)}y`
            : absDiff >= 86400
            ? `+${(absDiff / 86400).toFixed(1)}d`
            : `+${(absDiff / 3600).toFixed(1)}h`;

        shifts.push({
            title: node.record?.eventTitle || 'Event',
            oldDate: oldDate.date,
            newDate: newDate.date,
            shift: shiftStr
        });
    }

    return shifts;
}
