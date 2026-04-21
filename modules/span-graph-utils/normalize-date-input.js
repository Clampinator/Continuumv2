
export function normalizeDateInput(val) {
    if (!val) return "";
    // If it's already a clean YYYY-MM-DD string, don't pass it through the Date object at all
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    
    // Use UTC getters to ensure the date parts match the literal input string
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
