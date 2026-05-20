
import { syncPickerToText } from './sync-picker-to-text.js';
import { syncTextToPicker } from './sync-text-to-picker.js';
import { enableSmartSelection } from './enable-smart-selection.js';

/**
 * Initializes listeners for a single date-picker-container.
 * @param {JQuery} container 
 */
export function initializeDatePicker(container) {
    const textInput = container.find('.date-text-input');
    const dateInput = container.find('.date-picker-hidden');
    
    syncPickerToText(dateInput, textInput);
    syncTextToPicker(textInput, dateInput);
    enableSmartSelection(textInput);

    // PRE-OPEN SYNC: Fix for native browser calendar focus.
    // Modern browsers (Chrome/Edge/Safari) initialize the date picker UI based on the 
    // current value of the input[type="date"] at the moment of interaction.
    dateInput.on('pointerdown focus', () => {
        const currentTextValue = textInput.val();
        
        // Validation: Only sync if the text input contains a valid ISO date (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(currentTextValue)) {
            // Force the value into the hidden picker immediately before the UI opens.
            // This prevents the calendar from defaulting to 'Today' when the text field 
            // contains a historical or future date.
            dateInput.val(currentTextValue);
        }
    });
}
