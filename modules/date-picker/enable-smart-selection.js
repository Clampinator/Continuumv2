
/**
 * Enables smart segment selection (Year/Month/Day) when clicking on a date string.
 * @param {JQuery} textInput 
 */
export function enableSmartSelection(textInput) {
    textInput.off('click.picker').on('click.picker', (e) => {
        const input = e.currentTarget;
        const value = input.value;
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const caret = input.selectionStart;
            if (caret < 5) {
                input.setSelectionRange(0, 4); // Year
            } else if (caret >= 5 && caret < 8) {
                input.setSelectionRange(5, 7); // Month
            } else {
                input.setSelectionRange(8, 10); // Day
            }
        }
    });
}
