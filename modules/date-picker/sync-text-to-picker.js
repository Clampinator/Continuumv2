
/**
 * Synchronizes the text input field to the hidden date input (calendar picker).
 * @param {JQuery} textInput 
 * @param {JQuery} dateInput 
 */
export function syncTextToPicker(textInput, dateInput) {
    textInput.off('change.picker').on('change.picker', (e) => {
        const val = e.target.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            dateInput.val(val);
        }
    });
}
