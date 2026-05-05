import { SECONDS_IN_YEAR } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

// Approximate width per character for 11px bold Segoe UI with text-anchor:start
const LABEL_CHAR_WIDTH = 7;
// Pad each edge so boundary nodes (r=4) sit visually inside the band rather than on its edge.
const NODE_PAD = 5;
// Line height for collision purposes (font-size + a small gap)
const LABEL_LINE_HEIGHT = 13;
// Vertical gap between stacked labels
const LABEL_STACK_GAP = 2;

/**
 * Renders Experience blocks with Milestone 3 Subjective Fading.
 * Opacity diminishes based on distance from "Now".
 * Labels that would overlap are pushed downward to avoid collisions.
 */
export function drawExperienceBlocks(svgLayer, viewState, graphData) {
    const svgNS = "http://www.w3.org/2000/svg";
    svgLayer.innerHTML = '';

    if (!graphData.experienceSegments) return;

    const nowAge = graphData.nowNode.age;
    const FADE_LIMIT = 15 * SECONDS_IN_YEAR;

    // Build layout info for each visible segment
    const items = [];
    for (const seg of graphData.experienceSegments) {
        const x1 = (seg.startAge * viewState.scaleX) + viewState.x;
        const x2 = (seg.endAge * viewState.scaleX) + viewState.x;
        const w = Math.max(1, x2 - x1);

        const y1 = (seg.startTime * viewState.scaleY) + viewState.y;
        const y2 = (seg.endTime * viewState.scaleY) + viewState.y;
        const rectY = Math.min(y1, y2);
        const rectH = Math.max(1, Math.abs(y2 - y1));

        // NaN Guard
        if (isNaN(x1) || isNaN(rectY) || isNaN(w) || isNaN(rectH)) continue;

        // Single-authority opacity: use pre-computed value from generateExperiences.
        // The Forgetting formula lives in one place (generate-experiences.js), not here.
        const opacity = seg.opacity !== undefined ? seg.opacity : 1.0;
        if (opacity <= 0) continue;

        const name = seg.name || "Experience";
        items.push({
            seg,
            x1, w, rectY, rectH, opacity,
            labelX: x1 + 5,
            labelY: rectY + 12,   // natural position - may be adjusted below
            labelW: name.length * LABEL_CHAR_WIDTH,
            name
        });
    }

    // Resolve label collisions with a greedy top-down sweep.
    // Sort a working copy by natural Y then X so we always push downward.
    const sorted = [...items].sort((a, b) => a.labelY - b.labelY || a.labelX - b.labelX);

    for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        let maxBottom = -Infinity;

        for (let j = 0; j < i; j++) {
            const prev = sorted[j];
            // Check horizontal overlap between the two label bounding boxes.
            const xOverlap = curr.labelX < prev.labelX + prev.labelW &&
                             curr.labelX + curr.labelW > prev.labelX;
            if (!xOverlap) continue;

            const prevBottom = prev.labelY + LABEL_LINE_HEIGHT + LABEL_STACK_GAP;
            if (prevBottom > maxBottom) maxBottom = prevBottom;
        }

        // Push curr down only if a real collision was found.
        if (isFinite(maxBottom) && maxBottom > curr.labelY) {
            curr.labelY = maxBottom;
        }
    }

    // Draw rects then labels (items still in original segment order; labelY values
    // were mutated in place through the shared object references above).
    for (const item of items) {
        const { seg, x1, w, rectY, rectH, opacity } = item;

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x1);
        rect.setAttribute('y', rectY);
        rect.setAttribute('width', w);
        rect.setAttribute('height', rectH);
        rect.classList.add('graph-experience-rect');
        rect.style.opacity = opacity;

        if (seg.isClosed) {
            rect.setAttribute('fill', 'rgba(255, 180, 0, 0.15)');
            rect.setAttribute('stroke', `rgba(255, 180, 0, ${0.3 * opacity})`);
        } else {
            rect.setAttribute('fill', 'url(#expFadeGradient)');
        }

        svgLayer.appendChild(rect);

        const label = document.createElementNS(svgNS, 'text');
        label.setAttribute('x', item.labelX);
        label.setAttribute('y', item.labelY);
        label.classList.add('graph-exp-label');
        label.setAttribute('data-id', seg.expId);
        label.setAttribute('data-era-id', seg.eraId);
        label.style.opacity = opacity;
        label.textContent = item.name;

        svgLayer.appendChild(label);
    }
}
