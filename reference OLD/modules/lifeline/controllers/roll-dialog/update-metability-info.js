
import { ITEM_DATA } from '../../../../item-data.js';

/**
 * Updates the text content of metability info boxes based on rank.
 * @param {string} name - Metability key.
 * @param {number} rank - Target rank (1-5).
 * @param {JQuery} html - Dialog HTML context.
 */
export function updateMetabilityInfo(name, rank, html) {
    const data = ITEM_DATA.metabilities[name]?.ranks[rank || 1];
    if (!data) return;
    
    html.find('.info-box').each((_, el) => {
        const box = $(el);
        const key = box.data('key');
        if (key) {
            box.find('p').html(data[key] || '—');
        }
    });
}
