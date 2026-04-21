/**
 * Maps internal attribute keys to their display names.
 * Use this for any user-visible text that references an attribute by name.
 * @param {string} key - Internal key: 'body', 'mind', 'eq', 'quick', etc.
 * @returns {string} Display name.
 */
export function getAttributeLabel(key) {
    const labels = {
        body: 'Force',
        mind: 'Analyze',
        eq: 'Relate',
        quick: 'Move'
    };
    const clean = (key || '').replace('meta-', '').toLowerCase();
    return labels[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
}
