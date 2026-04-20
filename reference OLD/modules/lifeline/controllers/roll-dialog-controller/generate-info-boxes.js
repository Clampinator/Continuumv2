
import { ITEM_DATA } from '/systems/continuum/item-data.js';

/**
 * Dynamically populates the left and right info containers with metability stat boxes.
 * @param {string} name - Metability key.
 * @param {JQuery} html - Dialog HTML context.
 */
export function generateInfoBoxes(name, html) {
    const leftContainer = html.find('.metability-info-left');
    const rightContainer = html.find('.metability-info-right');
    const info = ITEM_DATA.metabilities[name];

    leftContainer.empty().hide();
    rightContainer.empty().hide();

    if (!info) return;

    leftContainer.show().css('display', 'flex');
    rightContainer.show().css('display', 'flex');

    const labels = Object.entries(info.labels);
    const midPoint = Math.ceil(labels.length / 2);

    labels.forEach(([key, labelText], index) => {
        const boxHtml = `<div class="info-box" data-key="${key}"><h4>${labelText}</h4><p></p></div>`;
        if (index < midPoint) {
            leftContainer.append(boxHtml);
        } else {
            rightContainer.append(boxHtml);
        }
    });
}
