
import { activateDatePickers as activate } from './date-picker/activate-date-pickers.js';

/**
 * Public entry point for date picker activation.
 * Decimated per ALF Protocol.
 */
export function activateDatePickers(html) {
    return activate(html);
}
