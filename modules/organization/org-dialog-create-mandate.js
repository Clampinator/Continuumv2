import { Sound } from '../sound-manager.js';

const FORM_STYLE = `style="display:grid; grid-template-columns:130px 1fr; align-items:center; gap:6px 10px;"`;
const LABEL_STYLE = `style="text-align:right; white-space:nowrap;"`;
const INPUT_STYLE = `style="width:100%;"`;

/**
 * Dialog to create a new Mandate from the Org Lifeline or Org Graph HUD.
 */
export function showCreateMandateDialog(sheet) {
    const content = `
        <form autocomplete="off" ${FORM_STYLE}>
            <label ${LABEL_STYLE}>${game.i18n.localize("CONTINUUM.Dialogs2.WeWill")}</label>
            <input type="text" name="description" ${INPUT_STYLE} autofocus placeholder="${game.i18n.localize('CONTINUUM.OrgMandates.WeWillPlaceholder')}"/>
            <label ${LABEL_STYLE}>${game.i18n.localize("CONTINUUM.Dialogs2.Importance")}</label>
            <select name="importance" ${INPUT_STYLE}>
                <option value="Passing">${game.i18n.localize("CONTINUUM.Goals.Passing")}</option>
                <option value="Mild">${game.i18n.localize("CONTINUUM.Goals.Mild")}</option>
                <option value="Important">${game.i18n.localize("CONTINUUM.Goals.Important")}</option>
                <option value="Extreme">${game.i18n.localize("CONTINUUM.Goals.Extreme")}</option>
                <option value="Critical">${game.i18n.localize("CONTINUUM.Goals.Critical")}</option>
            </select>
            <label ${LABEL_STYLE}>${game.i18n.localize("CONTINUUM.Dialogs2.ByCondition")}</label>
            <input type="text" name="condition" ${INPUT_STYLE} placeholder="${game.i18n.localize('CONTINUUM.OrgMandates.ByPlaceholder')}"/>
        </form>
    `;

    new Dialog({
        eventTitle: game.i18n.localize("CONTINUUM.Dialogs2.CreateNewMandate"),
        content: content,
        render: (html) => {
            html.find("input[type='text']").on("focus", event => event.currentTarget.select());
        },
        buttons: {
            create: {
                label: game.i18n.localize("CONTINUUM.Dialogs2.Create"),
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const newId = foundry.utils.randomID();
                    await sheet.actor.update({
                        [`system.mandates.${newId}`]: {
                            id: newId,
                            description: formData.description,
                            importance: formData.importance,
                            condition: formData.condition,
                            createdAt: Date.now()
                        }
                    });
                    Sound.confirm();
                }
            },
            cancel: { label: game.i18n.localize("CONTINUUM.Common.Cancel") }
        },
        default: "create"
    }, { classes: ["continuum-v2", "dialog"], width: 480 }).render(true);
}

/**
 * Dialog to edit an existing Mandate (opened via right-click on the chip).
 */
export function openMandateEditDialog(sheet, mandateId, mandateData, viewState) {
    const isResolved      = mandateData.importance === 'Achieved';
    const activeImportance = isResolved ? 'Important' : (mandateData.importance || 'Important');

    const opt = (val) => `<option value="${val}" ${activeImportance === val ? 'selected' : ''}>${game.i18n.localize("CONTINUUM.Goals." + val)}</option>`;

    const content = `
        <form autocomplete="off" ${FORM_STYLE}>
            <label ${LABEL_STYLE}>${game.i18n.localize("CONTINUUM.Dialogs2.WeWill")}</label>
            <input type="text" name="description" ${INPUT_STYLE} value="${(mandateData.description || '').replace(/"/g, '&quot;')}" autofocus/>
            <label ${LABEL_STYLE} id="importance-label" ${isResolved ? 'style="display:none; text-align:right;"' : ''}>${game.i18n.localize("CONTINUUM.Dialogs2.Importance")}</label>
            <select name="importance" ${INPUT_STYLE} id="importance-select" ${isResolved ? 'style="display:none; width:100%;"' : ''}>
                ${opt('Passing')}${opt('Mild')}${opt('Important')}${opt('Extreme')}${opt('Critical')}
            </select>
            <label ${LABEL_STYLE}>${game.i18n.localize("CONTINUUM.Dialogs2.ByCondition")}</label>
            <input type="text" name="condition" ${INPUT_STYLE} value="${(mandateData.condition || '').replace(/"/g, '&quot;')}"/>
            <label ${LABEL_STYLE}>${game.i18n.localize("CONTINUUM.Dialogs2.Resolved")}</label>
            <div>
                <input type="checkbox" name="resolved" ${isResolved ? 'checked' : ''}/>
                <span style="font-size:0.85em; color:#aaa; margin-left:4px;">${game.i18n.localize("CONTINUUM.Dialogs2.HidesFromHud")}</span>
            </div>
        </form>
    `;

    new Dialog({
        eventTitle: game.i18n.localize("CONTINUUM.Dialogs2.EditMandate"),
        content: content,
        render: (html) => {
            html.find("input[type='text']").on("focus", event => event.currentTarget.select());
            html.find('input[name="resolved"]').on('change', (e) => {
                const show = !e.currentTarget.checked;
                html.find('#importance-label, #importance-select').toggle(show);
            });
        },
        buttons: {
            save: {
                label: game.i18n.localize("CONTINUUM.Dialogs2.Save"),
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData   = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const importance = formData.resolved ? 'Achieved' : (formData.importance || 'Important');
                    await sheet.actor.update({
                        [`system.mandates.${mandateId}.description`]: formData.description,
                        [`system.mandates.${mandateId}.importance`]:  importance,
                        [`system.mandates.${mandateId}.condition`]:   formData.condition,
                    });
                    Sound.confirm();
                }
            },
            delete: {
                label: game.i18n.localize("CONTINUUM.Common.Delete"),
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.mandates.-=${mandateId}`]: null });
                    Sound.delete();
                }
            },
            cancel: { label: game.i18n.localize("CONTINUUM.Common.Cancel") }
        },
        default: "save",
        close: () => { if (viewState) viewState.interactionMode = 'pan'; }
    }, { classes: ["continuum-v2", "dialog"], width: 480 }).render(true);
}
