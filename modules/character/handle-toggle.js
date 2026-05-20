
export function handleCharacterToggleChange(sheet, event) {
    const checkbox = event.currentTarget;
    if (!checkbox.id) return;
    sheet.actor.setFlag('continuum-v2', `sheetState.toggles.${checkbox.id}`, checkbox.checked);
}
