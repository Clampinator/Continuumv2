
export function handleCharacterSituationClick(sheet, event) {
    event.preventDefault();
    const button = event.currentTarget;
    const value = button.dataset.rollType || button.dataset.value;
    const dialog = sheet.element.find('.dialog-overlay');
    dialog.find('input[name="situation"]').val(value);
    dialog.find('.situation-roll-button, .situation-mod').removeClass('active');
    $(button).addClass('active');
}
