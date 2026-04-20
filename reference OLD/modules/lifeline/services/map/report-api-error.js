
/**
 * Dispatches a user-facing error notification via the Foundry UI.
 * @param {string} message - The error message to display.
 */
export function reportApiError(message) {
    const fullMessage = `Continuum | Map Error: ${message}`;
    console.error(fullMessage);
    if (ui.notifications) {
        ui.notifications.error(fullMessage, { permanent: true });
    }
}
