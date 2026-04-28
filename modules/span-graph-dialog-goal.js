// continuum/modules/span-graph-dialog-goal.js
import { Sound } from './sound-manager.js';

export function openGoalEditDialog(sheet, goalId, goalData, viewState) {
    const isResolved = goalData.importance === 'Achieved';
    // When editing a resolved goal we show the importance dropdown hidden; if they
    // uncheck Resolved we fall back to "Important" as a sensible default.
    const activeImportance = isResolved ? 'Important' : (goalData.importance || 'Important');

    const content = `
        <form autocomplete="off">
            <div class="form-group"><label>I will... (Description)</label><input type="text" name="description" value="${goalData.description || ''}" autofocus/></div>
            <div class="form-group" id="importance-row" style="${isResolved ? 'display:none;' : ''}">
                <label>Importance</label>
                <select name="importance">
                    <option value="Passing" ${activeImportance === 'Passing' ? 'selected' : ''}>Passing</option>
                    <option value="Mild" ${activeImportance === 'Mild' ? 'selected' : ''}>Mild</option>
                    <option value="Important" ${activeImportance === 'Important' ? 'selected' : ''}>Important</option>
                    <option value="Extreme" ${activeImportance === 'Extreme' ? 'selected' : ''}>Extreme</option>
                    <option value="Critical" ${activeImportance === 'Critical' ? 'selected' : ''}>Critical</option>
                </select>
            </div>
            <div class="form-group"><label>by... (Condition)</label><input type="text" name="condition" value="${goalData.condition || ''}"/></div>
            <div class="form-group goal-resolved-row">
                <label>Resolved</label>
                <input type="checkbox" name="resolved" ${isResolved ? 'checked' : ''}/>
                <span style="font-size:0.85em;color:#aaa;">Goal has been achieved — hides it from the lifeline HUD</span>
            </div>
        </form>
    `;

    new Dialog({
        eventTitle: "Edit Goal",
        content: content,
        render: (html) => {
            html.find('input[name="resolved"]').on('change', (e) => {
                const checked = e.currentTarget.checked;
                html.find('#importance-row').toggle(!checked);
            });
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const importance = formData.resolved ? 'Achieved' : (formData.importance || 'Important');
                    await sheet.actor.update({
                        [`system.goals.${goalId}.description`]: formData.description,
                        [`system.goals.${goalId}.importance`]: importance,
                        [`system.goals.${goalId}.condition`]: formData.condition
                    });
                    Sound.confirm();
                }
            },
            delete: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.goals.-=${goalId}`]: null });
                    Sound.delete();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => { viewState.interactionMode = 'pan'; }
    }, { classes: ["continuum-v2", "dialog"], width: "auto", height: "auto" }).render(true);
}
