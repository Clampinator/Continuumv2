import { getTemplateData } from './get-template-data.js';
import { handleSubmit } from './handle-submit.js';
import { activateDatePickers } from '../../../../date-picker.js';
import { renderGraph } from '../../../../span-graph-render.js';
import { panToLocation, getMapCenterLocation } from '../../../../span-graph-map.js';
import { Sound } from '../../../../sound-manager.js';
import { getSheetContext } from '../../../../span-graph-state.js';

export async function openEventDialog(sheet, params) {
    const { viewState, graphData } = getSheetContext(sheet);
    
    if (viewState.interactionMode === 'dialog-open') return;
    viewState.interactionMode = 'dialog-open';

    let confirmed = false;
    const actor = sheet.actor;
    const templateData = getTemplateData(actor, { ...params, viewState, graphData });

    const dialogTitle = {
        'edit': templateData.eventIsSpan ? "Edit Span" : "Edit Event",
        'insert': "Insert Event into History",
        'log': templateData.eventIsSpan ? "Log Span Result" : "Log Normal Leveling"
    }[params.mode];

    const content = await foundry.applications.handlebars.renderTemplate("systems/continuum-v2/templates/dialogs/event-node-editor.html", templateData);

    const buttons = {
        save: {
            label: params.mode === 'edit' ? "Save Changes" : "Commit to Lifeline",
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
        }
    };

    if (params.mode === 'edit' && params.existingData) {
        buttons.delete = {
            label: "Delete",
            icon: '<i class="fas fa-trash"></i>',
            callback: async () => {
                confirmed = true;
                const data = params.existingData;
                const oldRoot = data.expId ? `system.eras.${data.eraId}.experiences.${data.expId}` : `system.eras.${data.eraId}`;
                const deletePath = `${oldRoot}.events.-=${data.id}`;
                
                const updates = { [deletePath]: null };
                
                // --- CASCADING DELETION LOGIC ---
                // If this node was the one that started an experience, delete that experience too
                if (data.startsExpId) {
                    updates[`system.eras.${data.eraId}.experiences.-=${data.startsExpId}`] = null;
                }

                await actor.update(updates);
                Sound.delete();
            }
        };
    }

    buttons.cancel = { 
        label: "Cancel",
        callback: () => {
            confirmed = false;
        }
    };

    const dialog = new Dialog({
        eventTitle: dialogTitle,
        content: content,
        render: (html) => {
            activateDatePickers(html);
            
            const contextList = html.find('.context-list-scroll');
            
            // --- AUTOMATION: HANDOVER WORKFLOW ---
            const handleHandoverAutomation = (isChecked) => {
                if (!isChecked) return;
                
                // 1. Identify which radio is currently selected
                const selectedAction = contextList.find('input[name="experienceAction"]:checked').val();
                if (selectedAction && String(selectedAction).startsWith('move:')) {
                    const parts = String(selectedAction).split(':');
                    const currentExpId = parts[2];
                    
                    // 2. If it's a valid experience, find its "Close" checkbox and check it automatically
                    if (currentExpId && currentExpId !== 'null' && currentExpId !== 'undefined') {
                        const closeCheckbox = contextList.find(`#ce-${currentExpId}`);
                        if (closeCheckbox.length && !closeCheckbox.is(':checked')) {
                            // Ensure we trigger the native checkbox behavior
                            closeCheckbox.prop('checked', true).trigger('change');
                            ui.notifications.info("Handover Suggested: Closing current experience.");
                        }
                    }
                }
            };

            // Toggle visibility of 'New Experience' group
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

            // Behavior: Clicking a line toggles its input (radio or checkbox)
            contextList.find('.context-item').on('click', (e) => {
                // Ignore if clicking the actual input or its direct label
                if ($(e.target).is('input, label')) return;
                
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

            // ENTER on location inputs triggers Locate button
            html.on('keydown', '.input-with-btn input[type="text"]', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    const container = $(event.currentTarget).closest('.input-with-btn');
                    const locateBtn = container.find('.locate-btn');
                    if (locateBtn.length) locateBtn.click();
                }
            });

            // Map Integration: Locate and Grab buttons
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
            if (!confirmed && params.mode === 'log' && viewState.dragStartWorld) {
                graphData.nowNode.age = viewState.dragStartWorld.age;
                graphData.nowNode.time = viewState.dragStartWorld.time;
            }

            viewState.interactionMode = 'pan';
            const svg = sheet.element.find('.span-graph-svg')[0];
            if (svg) renderGraph(svg, viewState, graphData);
        }
    }, { classes: ["continuum-v2", "dialog"], width: 480 });

    dialog.render(true);
}
