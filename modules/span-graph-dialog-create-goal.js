import { Sound } from './sound-manager.js';

/**
 * Dialog to create a new Goal from the Graph HUD.
 */
export function showCreateGoalDialog(sheet) {
    const content = `
        <form>
            <div class="form-group"><label>I will... (Description)</label><input type="text" name="description" autofocus placeholder="...achieve greatness"/></div>
            <div class="form-group">
                <label>Importance</label>
                <select name="importance">
                    <option value="Passing">Passing</option>
                    <option value="Mild">Mild</option>
                    <option value="Important">Important</option>
                    <option value="Extreme">Extreme</option>
                    <option value="Critical">Critical</option>
                </select>
            </div>
            <div class="form-group"><label>by... (Condition)</label><input type="text" name="condition" placeholder="...doing the thing"/></div>
        </form>
    `;

    new Dialog({
        title: "Create New Goal",
        content: content,
        render: (html) => {
            html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());
        },
        buttons: {
            create: {
                label: "Create",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const newId = foundry.utils.randomID();
                    await sheet.actor.update({
                        [`system.goals.${newId}`]: {
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
            cancel: { label: "Cancel" }
        },
        default: "create"
    }, { classes: ["continuum-v2", "dialog"], width: "auto", height: "auto" }).render(true);
}
