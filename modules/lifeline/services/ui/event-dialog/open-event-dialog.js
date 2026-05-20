import { getTemplateData } from './get-template-data.js';
import { handleSubmit } from './handle-submit.js';
import { activateDatePickers } from '/systems/continuum-v2/modules/date-picker.js';
import { panToLocation, getMapCenterLocation } from '/systems/continuum-v2/modules/span-graph-map.js';
import { getActorTokenLocation } from '/systems/continuum-v2/modules/map-manager.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';

/**
 * HUD: OPEN EVENT DIALOG
 * Authoritative interface for committing historical and physical data.
 */
export async function openEventDialog(sheet, params) {
    const actor = sheet.actor; 
    let confirmed = false;

    const templateData = getTemplateData(actor, params);

    // TOKEN-FIRST: For new events (log/insert), auto-fill location
    // fields from the proxy token's current position on the SpaceTime
    // map. This is the primary geographic workflow - drag the token,
    // then create the event. Edit mode uses the existing event's data.
    if (params.mode !== 'edit') {
        const tokenPos = await getActorTokenLocation(actor);
        if (tokenPos) {
            // Level event location
            if (templateData.lat == null) templateData.lat = tokenPos.lat;
            if (templateData.lng == null) templateData.lng = tokenPos.lng;
            if (!templateData.eventLocation && tokenPos.formattedAddress) {
                templateData.eventLocation = tokenPos.formattedAddress;
            }
            templateData.zoom = templateData.zoom ?? tokenPos.zoom ?? 12;
            // Span departure inherits the same position
            if (templateData.eventSpanFromLat == null) templateData.eventSpanFromLat = tokenPos.lat;
            if (templateData.eventSpanFromLng == null) templateData.eventSpanFromLng = tokenPos.lng;
            if (!templateData.eventSpanFromLocation && tokenPos.formattedAddress) {
                templateData.eventSpanFromLocation = tokenPos.formattedAddress;
            }
        }
    }

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
            _activateInternalListeners(html, dialog, actor);
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

function _activateInternalListeners(html, dialog, actor) {
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

    // 4. Token Location - captures actor position at slider time and fills form fields.
    // Keyframes are synced automatically when the dialog is saved via updateActor hook.
    html.find('.token-btn').on('click', async (e) => {
        const btn = $(e.currentTarget);
        btn.find('i').attr('class', 'fas fa-spinner fa-spin');
        const result = await getActorTokenLocation(actor);
        btn.find('i').attr('class', 'fas fa-person');

        if (!result) {
            ui.notifications.warn("No SpaceTime position available. Set the slider to a time when this character has a located lifeline event, then try again.");
            return;
        }

        const container = btn.closest('.input-with-btn');
        const input = container.find('input[type="text"]');
        container.find('input[name*="Lat"]').val(result.lat);
        container.find('input[name*="Lng"]').val(result.lng);
        container.find('input[name*="Zoom"]').val(result.zoom || 12);
        if (result.formattedAddress) input.val(result.formattedAddress);
    });
}
