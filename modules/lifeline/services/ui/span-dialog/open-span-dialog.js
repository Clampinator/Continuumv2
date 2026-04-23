import { getTemplateData } from './get-template-data.js';
import { handleSubmit } from '../event-dialog/handle-submit.js';
import { activateDatePickers } from '/systems/continuum-v2/modules/date-picker.js';
import { panToLocation, getMapCenterLocation } from '/systems/continuum-v2/modules/span-graph-map.js';
import { getSheetContext } from '/systems/continuum-v2/modules/span-graph-state.js';

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
        ageRaw: params.arrival.age,
        timeRaw: params.arrival.time,
        departure: params.departure,
        viewState, 
        graphData, 
        isSpan: true 
    });

    // Exact legacy title logic
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
        title: dialogTitle,
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
            const spanToggle = html.find('input[name="isSpan"]');
            const restCheckbox = html.find('input[name="isRest"]');
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
                    graphData.nowNode.age = viewState.dragStartWorld.age;
                    graphData.nowNode.time = viewState.dragStartWorld.time;
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
