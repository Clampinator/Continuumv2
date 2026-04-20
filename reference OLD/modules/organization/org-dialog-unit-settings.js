import { Sound } from '../sound-manager.js';

/**
 * Per-unit settings dialog.
 * Fields: inception date, logo image.
 * More will be added here over time.
 *
 * @param {Object} sheet      - The org actor sheet
 * @param {string} unitId     - The unit's key in system.conflict[unitType]
 * @param {string} unitType   - "physical" | "espionage" | "online" | "psyops"
 * @param {Object} unit       - The unit data object
 */
export function showUnitSettingsDialog(sheet, unitId, unitType, unit) {
    const unitName      = unit.description || `${unitType} unit`;
    const currentDate   = unit.inceptionDate || '';
    const currentLogo   = unit.logo || '';

    const content = `
        <form autocomplete="off" style="display:grid; grid-template-columns:140px 1fr; align-items:center; gap:10px 12px;">

            <label style="text-align:right; white-space:nowrap;">Inception Date</label>
            <input type="date" name="inceptionDate" value="${currentDate}" style="width:100%;"/>

            <label style="text-align:right; white-space:nowrap;">Unit Logo</label>
            <div style="display:flex; gap:6px; align-items:center;">
                <input type="text" name="logo" value="${currentLogo}" placeholder="Path or URL to image" style="flex:1; min-width:0;"/>
                <button type="button" class="unit-logo-browse" title="Browse for image" style="flex:0 0 auto; padding:2px 6px;">
                    <i class="fas fa-file-image"></i>
                </button>
            </div>

            ${currentLogo ? `
            <div style="grid-column:2; display:flex; justify-content:center;">
                <img class="unit-logo-preview" src="${currentLogo}" style="max-width:64px; max-height:64px; border-radius:50%; border:2px solid #555; object-fit:cover;"/>
            </div>` : `<div style="grid-column:2;"></div>`}

            <span style="grid-column:1/-1; font-size:0.78em; color:#777; text-align:center;">
                Inception Date determines when this unit's track starts on the Operational Map (defaults to org inception).
                The logo is used as the unit's head node icon on the graph and as its map marker.
            </span>
        </form>
    `;

    new Dialog({
        title: `Unit Settings — ${unitName}`,
        content: content,
        render: (html) => {
            // Live preview as user types/pastes a path
            html.find('input[name="logo"]').on('input', (e) => {
                const val = e.currentTarget.value.trim();
                let preview = html.find('.unit-logo-preview');
                if (val) {
                    if (!preview.length) {
                        const previewHtml = `<img class="unit-logo-preview" style="max-width:64px; max-height:64px; border-radius:50%; border:2px solid #555; object-fit:cover; display:block; margin:0 auto;"/>`;
                        html.find('input[name="logo"]').closest('div').after(`<div style="grid-column:2; display:flex; justify-content:center;">${previewHtml}</div>`);
                        preview = html.find('.unit-logo-preview');
                    }
                    preview.attr('src', val).show();
                } else {
                    preview.hide();
                }
            });

            // FilePicker browse button
            html.find('.unit-logo-browse').on('click', () => {
                const input = html.find('input[name="logo"]');
                new FilePicker({
                    type: 'image',
                    current: input.val(),
                    callback: (path) => {
                        input.val(path).trigger('input');
                    }
                }).browse();
            });
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new FormDataExtended(html.find("form")[0]).object;
                    await sheet.actor.update({
                        [`system.conflict.${unitType}.${unitId}.inceptionDate`]: formData.inceptionDate || null,
                        [`system.conflict.${unitType}.${unitId}.logo`]:          formData.logo || null,
                    });
                    Sound.confirm();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save"
    }, { classes: ["continuum", "dialog"], width: 420 }).render(true);
}
