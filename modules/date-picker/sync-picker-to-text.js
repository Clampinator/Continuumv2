
/**
 * Synchronizes the hidden date input (calendar picker) to the text input field.
 * @param {JQuery} dateInput 
 * @param {JQuery} textInput 
 */
export function syncPickerToText(dateInput, textInput) {
    dateInput.off('input.picker change.picker').on('input.picker change.picker', (e) => {
        const val = e.target.value;
        if (textInput.val() !== val) {
            textInput.val(val);
            if (e.type === 'change') {
                textInput.trigger('change');
            }
        }
    });
}
