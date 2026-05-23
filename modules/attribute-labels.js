/**
 * Maps internal attribute keys to their display names.
 * Use this for any user-visible text that references an attribute by name.
 * @param {string} key - Internal key: 'force', 'analyze', 'relate', 'react', etc.
 * @returns {string} Display name.
 */
export function getAttributeLabel(key) {
    const labels = {
        force: 'Force',
        analyze: 'Analyze',
        relate: 'Relate',
        react: 'React',
        naturalspan: 'Nat Span'
    };
    // Legacy compatibility: map old keys to new for pre-migration actors
    const legacyMap = { body: 'force', mind: 'analyze', eq: 'relate', quick: 'react' };
    const clean = (key || '').replace('meta-', '').toLowerCase();
    const resolved = legacyMap[clean] || clean;
    return labels[resolved] || (resolved.charAt(0).toUpperCase() + resolved.slice(1));
}
