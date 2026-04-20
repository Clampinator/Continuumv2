
export function handleOrgToggleChange(sheet, event) {
    const checkbox = event.currentTarget;
    if (!checkbox.id) return;
    sheet.actor.setFlag('continuum', `sheetState.toggles.${checkbox.id}`, checkbox.checked);
}
