/*
Routes gear use based on gear type:
- Firearm: triggers a Quick (ranged) attack roll with the firearm's bonus
- Technology/Tool: opens the attribute roll dialog with the gear pre-selected
- Vehicle: triggers a vehicle roll with the vehicle gear pre-selected
*/

export function handleGearUse(sheet, event) {
    const itemId = $(event.currentTarget).data('item-id');
    const item = sheet.actor.items.get(itemId);
    if (!item) return;

    const gearType = item.system?.gearType || 'technology';
    const computedBonus = Math.floor((
        (Number(item.system?.aspects?.aspect1) || 0) +
        (Number(item.system?.aspects?.aspect2) || 0) +
        (Number(item.system?.aspects?.aspect3) || 0)
    ) / 3);

    const html = sheet.element;

    if (gearType === 'firearm') {
        const attackBtn = html.find('.roll-weapon[data-attribute="quick"]').first();
        if (attackBtn.length) {
            attackBtn.trigger('click');
            html.find('input[name="situational_modifier"]').val(computedBonus);
            html.find('.dialog-content').data('gearId', itemId);
            html.find('.dialog-content').data('gearName', item.name);
        }
    } else if (gearType === 'vehicle') {
        const vehicleClass = item.system?.vehicleClass || 'land';
        const vehicleBtn = html.find('.roll-vehicle').first();
        if (vehicleBtn.length) {
            vehicleBtn.trigger('click');
            html.find('.dialog-content').data('gearId', itemId);
            html.find('.dialog-content').data('gearName', item.name);
        }
    } else {
        const rollBtn = html.find('.roll-attribute').first();
        if (rollBtn.length) {
            rollBtn.trigger('click');
            html.find('input[name="situational_modifier"]').val(computedBonus);
            html.find('.dialog-content').data('gearId', itemId);
            html.find('.dialog-content').data('gearName', item.name);
            const gearSelect = html.find('.gear-select');
            if (gearSelect.length) {
                gearSelect.val(itemId);
            }
        }
    }
}
