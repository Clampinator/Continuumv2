import { getTemplateData } from './get-template-data.js';
import { handleSubmit } from './handle-submit.js';
import { activateDatePickers } from '/systems/continuum-v2/modules/date-picker.js';
import { panToLocation, getMapCenterLocation } from '/systems/continuum-v2/modules/span-graph-map.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';

/**
 * HUD: OPEN EVENT DIALOG
 * Authoritative interface for committing historical and physical data.
 */
export async function openEventDialog(sheet, params) {
    const actor = sheet.actor; 
    let confirmed = false;

    const templateData = getTemplateData(actor, params);

    const dialogTitle = {
        'edit': templateData.eventIsSpan ? "Edit Span" : "Edit Event",
        'insert': "Insert Event into History",
        'log': templateData.eventIsSpan ? "Log Span Result" : "Log Normal Leveling"
    }[params.mode];

    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/continuum-v2/templates/dialogs/event-node-editor.html", 
        templateData
    );

    const buttons = {
        save: {
            label: params.mode === 'edit' ? "Save Changes" : "Commit to Lifeline",
            icon: '<i class="fas fa-save"></i>',
            callback: async (html) => {
                confirmed = true;
                const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                await handleSubmit(actor, formData, params);
            }
        }
    };

    if (params.mode === 'edit' && params.existingData) {
        buttons.delete = {
            label: "Delete",
            icon: '<i class="fas fa-trash"></i>',
            callback: async () => {
                confirmed = true;
                // Delete logic moved to STATE layer (delete-history-row.js)
                const { deleteHistoryRow } = await import('../../../../state/delete-history-row.js');
                await deleteHistoryRow(actor, params.existingData.id);
                Sound.delete();
            }
        };
    }

    buttons.cancel = { 
        label: "Cancel",
        callback: () => { confirmed = false; }
    };

    const dialog = new Dialog({
        eventTitle: dialogTitle,
        content: content,
        render: (html) => {
            activateDatePickers(html);
            _activateInternalListeners(html, dialog);
        },
        buttons: buttons,
        default: "save",
        close: () => {
            // HANDSHAKE: Notify the Pointer Machine that the transaction is over.
            if (params.onClose) params.onClose(confirmed);
        }
    }, { classes: ["continuum-v2", "dialog"], width: 480 });

    dialog.render(true);
}

/**
 * Internal logic for dialog UI behaviors.
 * @private
 */
function _activateInternalListeners(html, dialog) {
    const contextList = html.find('.context-list-scroll');
    
    // 1. Experience Lifecycle
    const updateNewExpVisibility = () => {
        const isNewChecked = contextList.find('input[name="startNewExp"]').is(':checked');
        html.find('#newExpGroup').toggle(isNewChecked);
        dialog.setPosition({ height: "auto" });
    };

    contextList.find('.context-item').on('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
        const $item = $(e.currentTarget);
        const $input = $item.find('input[type="radio"], input[type="checkbox"]');
        if ($input.length) {
            $input.prop('checked', $input.is('[type="checkbox"]') ? !$input.is(':checked') : true).trigger('change');
        }
    });

    contextList.find('input').on('change', updateNewExpVisibility);
    updateNewExpVisibility();

    // 2. Type Switching
    const spanToggle = html.find('input[name="eventIsSpan"]');
    spanToggle.on('change', () => {
        const isChecked = spanToggle.is(':checked');
        html.find('#spanFields').toggle(isChecked);
        html.find('#eventFields').toggle(!isChecked);
        html.find('input[name="eventIsRest"]').prop('disabled', isChecked);
        dialog.setPosition({ height: "auto" });
    });

    // 3. Location Tools
    html.find('.locate-btn, .grab-btn').on('click', async (e) => {
        const btn = $(e.currentTarget);
        const isGrab = btn.hasClass('grab-btn');
        const input = btn.closest('.input-with-btn').find('input[type="text"]');
        
        btn.find('i').attr('class', 'fas fa-spinner fa-spin');
        const result = isGrab ? await getMapCenterLocation() : await panToLocation(input.val());
        btn.find('i').attr('class', isGrab ? 'fas fa-crosshairs' : 'fas fa-map-marker-alt');
        
        if (result) {
            const container = btn.closest('.input-with-btn');
            container.find('input[name*="Lat"]').val(result.lat); 
            container.find('input[name*="Lng"]').val(result.lng);
            container.find('input[name*="Zoom"]').val(result.zoom || 12);
            if (result.formattedAddress) input.val(result.formattedAddress);
        }
    });
}
