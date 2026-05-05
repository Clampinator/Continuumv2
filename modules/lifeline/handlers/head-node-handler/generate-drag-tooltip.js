import { formatSubjectiveAge, formatDuration } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { formatObjectiveDateLines } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/**
 * Generates tactile feedback for the drag tooltip.
 * Highlights spanning prohibitions for Levellers.
 */
export function generateDragTooltip(constrained, startWorld, mode, graphData, isValid, spanningRestricted, dx, dy) {
    const objDateLines = formatObjectiveDateLines(constrained.time);
    const subAgeStr = formatSubjectiveAge(constrained.age);
    
    const dAge = constrained.age - startWorld.age;
    const dTime = (constrained.time - startWorld.time) / 1000;
    const dist = Math.hypot(dx, dy);

    const lines = [
        `<strong>${objDateLines[0]}</strong>`,
        `<span style="color: #aaa;">${objDateLines[1]}</span>`,
        `Age: ${subAgeStr}`
    ];

    if (mode === 'span') {
        const costStr = formatDuration(Math.abs(dTime));
        const direction = dTime > 0 ? "UP" : "DOWN";
        lines.push(`<span style="color: #ff00ff; font-weight: bold;">SPAN ${direction}: ${costStr}</span>`);

        if (graphData.maxSpanPool > 0) {
            const remainingNow   = graphData.remainingSpanSeconds;
            const remainingAfter = remainingNow - Math.abs(dTime);
            const isOverspan     = remainingAfter < 0;

            const remainingNowStr   = formatDuration(Math.max(0, remainingNow));
            const remainingAfterStr = formatDuration(Math.abs(remainingAfter));

            lines.push(`<span style="color: #aaa;">Pool now:   ${remainingNowStr}</span>`);

            if (isOverspan) {
                lines.push(`<span style="color: #ff4444; font-weight: bold;">After: OVERSPAN by ${remainingAfterStr}</span>`);
            } else {
                const pct = remainingAfter / graphData.maxSpanPool;
                const col = pct < 0.15 ? '#ff4444' : pct < 0.35 ? '#ff9f43' : '#aaffaa';
                lines.push(`<span style="color: ${col};">After:   ${remainingAfterStr}</span>`);
            }
        }
    } else if (mode === 'level') {
        const spentStr = formatDuration(dAge);
        lines.push(`<span style="color: #00ccff; font-weight: bold;">AGING: ${spentStr}</span>`);
    }

    // LEVELLER BLOCK FEEDBACK
    if (spanningRestricted && graphData.spanRank === 0 && Math.abs(dy) > Math.abs(dx) && dist > 10) {
        return {
            lines: [...lines, `<span style="color: #ff4444; font-weight: bold;">SPANNING PROHIBITED: LEVELLER</span>`],
            isWarning: true
        };
    }

    if (!isValid && dAge < 0) {
        return {
            lines: [...lines, `<span style="color: #ff4444;">CANNOT AGE BACKWARDS</span>`],
            isWarning: true
        };
    }

    return {
        lines: lines,
        isWarning: false
    };
}
