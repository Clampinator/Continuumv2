
// Helper function to render just the input container part
export function renderDatePickerInput(name, value, placeholder="YYYY-MM-DD") {
    return `
        <div class="date-picker-container">
            <input type="text" class="date-text-input" name="${name}" value="${value || ''}" placeholder="${placeholder}" />
            <i class="fas fa-calendar-alt date-picker-icon"></i>
            <input type="date" class="date-picker-hidden" tabindex="-1" />
        </div>`;
}

// Helper function for consistent date pickers in dialogs (with label wrapper)
export function renderDatePicker(name, value, label) {
    return `
        <div class="form-group">
            <label>${label}</label>
            ${renderDatePickerInput(name, value)}
        </div>`;
}
