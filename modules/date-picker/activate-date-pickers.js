
import { initializeDatePicker } from './initialize-date-picker.js';

/**
 * Activates behavior for all date pickers within the given HTML context.
 * @param {JQuery} html 
 */
export function activateDatePickers(html) {
    html.find('.date-picker-container').each((i, el) => {
        initializeDatePicker($(el));
    });
}
