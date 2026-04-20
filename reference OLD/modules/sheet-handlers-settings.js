export async function handleSettingsClick(sheet, event) {
    event.preventDefault();
    const { actor } = sheet;
    const playersCanSeeSpan = actor.getFlag('continuum', 'playersCanSeeSpan') ?? false;
    const playersCanSeeNaturalSpan = actor.getFlag('continuum', 'playersCanSeeNaturalSpan') ?? false;
    const playersCanSeeMetabilities = actor.getFlag('continuum', 'playersCanSeeMetabilities') ?? false;
    const timelineDirection = actor.getFlag('continuum', 'timelineDirection') || 'bottom-to-top';

    const content = `
      <form>
        <div class="form-group" style="display: flex; align-items: center; padding: 5px 0; justify-content: space-between;">
          <label for="player-span-visibility">Let players see Span</label>
          <input type="checkbox" id="player-span-visibility" name="playersCanSeeSpan" style="flex-shrink: 0; width: 20px; height: 20px;" ${playersCanSeeSpan ? 'checked' : ''} />
        </div>
        <div class="form-group" style="display: flex; align-items: center; padding: 5px 0; justify-content: space-between;">
          <label for="player-natural-span-visibility">Let players see Natural Span</label>
          <input type="checkbox" id="player-natural-span-visibility" name="playersCanSeeNaturalSpan" style="flex-shrink: 0; width: 20px; height: 20px;" ${playersCanSeeNaturalSpan ? 'checked' : ''} />
        </div>
        <div class="form-group" style="display: flex; align-items: center; padding: 5px 0; justify-content: space-between;">
          <label for="player-metabilities-visibility">Let players see Metabilities</label>
          <input type="checkbox" id="player-metabilities-visibility" name="playersCanSeeMetabilities" style="flex-shrink: 0; width: 20px; height: 20px;" ${playersCanSeeMetabilities ? 'checked' : ''} />
        </div>
        <hr>
        <div class="form-group" style="display: flex; align-items: center; padding: 5px 0; justify-content: space-between;">
            <label for="timeline-direction">Subjective Time Flow</label>
            <select id="timeline-direction" name="timelineDirection" style="flex-shrink: 0; width: auto; background: #222; color: #fff; border: 1px solid #555; padding: 2px;">
                <option value="bottom-to-top" ${timelineDirection === 'bottom-to-top' ? 'selected' : ''}>Upwards (Top is Recent)</option>
                <option value="top-to-bottom" ${timelineDirection === 'top-to-bottom' ? 'selected' : ''}>Downwards (Top is Oldest)</option>
            </select>
        </div>
        <p class="notes" style="font-size: 0.8em; color: #888; margin-top: 5px;">Determines the direction in which Span Pool is calculated.</p>
      </form>
    `;

    new Dialog({
      title: "Sheet Settings",
      content: content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save Changes",
          callback: async (html) => {
            const seeSpan = html.find('input[name="playersCanSeeSpan"]').is(':checked');
            const seeNaturalSpan = html.find('input[name="playersCanSeeNaturalSpan"]').is(':checked');
            const seeMetabilities = html.find('input[name="playersCanSeeMetabilities"]').is(':checked');
            const direction = html.find('select[name="timelineDirection"]').val();

            await actor.setFlag('continuum', 'playersCanSeeSpan', seeSpan);
            await actor.setFlag('continuum', 'playersCanSeeNaturalSpan', seeNaturalSpan);
            await actor.setFlag('continuum', 'playersCanSeeMetabilities', seeMetabilities);
            await actor.setFlag('continuum', 'timelineDirection', direction);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "save"
    }, {
        classes: ["continuum", "dialog", "settings-dialog"],
        width: "auto",
        height: "auto"
    }).render(true);
}

export function handleToggleCheckboxChange(sheet, event) {
    const checkbox = event.currentTarget;
    if (!checkbox.id) return;
    sheet.actor.setFlag('continuum', `sheetState.toggles.${checkbox.id}`, checkbox.checked);
}

export function handleSituationClick(sheet, event) {
    event.preventDefault();
    const button = event.currentTarget;
    const value = button.dataset.value;
    const dialog = sheet.element.find('.dialog-overlay');
    dialog.find('input[name="situation"]').val(value);
    dialog.find('.situation-mod').removeClass('active');
    $(button).addClass('active');
}
