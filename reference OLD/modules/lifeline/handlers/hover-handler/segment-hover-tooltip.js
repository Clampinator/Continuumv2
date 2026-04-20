import { convertTimestampToDateString } from '../../../span-graph-utils/provide-span-graph-utils.js';

const TOOLTIP_ID = 'graph-segment-hover-tooltip';

/*
HTML tooltip that follows the mouse when hovering near a blue level segment.
Attached to document.body to bypass Foundry sheet overflow/z-index clipping.
*/
export const SegmentHoverTooltip = {
    show(event, fromTitle, fromTime, toTitle, toTime) {
        let el = document.getElementById(TOOLTIP_ID);
        if (!el) {
            el = document.createElement('div');
            el.id = TOOLTIP_ID;
            el.className = 'graph-drag-tooltip-html';
            el.style.borderColor = '#00ccff';
            document.body.appendChild(el);
        }
        const fromDT = convertTimestampToDateString(fromTime);
        const toDT = convertTimestampToDateString(toTime);
        el.innerHTML = `<span style="color:#00ccff">${fromTitle}</span>&nbsp;&nbsp;${fromDT.date}<br><span style="color:#aaa">${toTitle}</span>&nbsp;&nbsp;${toDT.date}`;
        el.style.left = `${event.clientX + 15}px`;
        el.style.top = `${event.clientY - 55}px`;
        el.classList.add('active');
    },

    hide() {
        const el = document.getElementById(TOOLTIP_ID);
        if (el) el.classList.remove('active');
    }
};
