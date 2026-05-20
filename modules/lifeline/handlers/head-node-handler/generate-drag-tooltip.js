import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { formatDurationCompact } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';
import { formatObjectiveDateLines } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { computeSpanCost } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';

/**
 * Generates tactile feedback for the drag tooltip.
 * Highlights spanning prohibitions for Levellers.
 *
 * Trinity: No pool math here. Span cost and remaining values are
 * computed by the Kernel and passed in as pre-computed parameters.
 * This function only formats and renders display strings.
 */
export function generateDragTooltip(constrained, startWorld, mode, graphData, isValid, spanningRestricted, dx, dy) {
    const objDateLines = formatObjectiveDateLines(constrained.time);
    const subAgeStr = formatSubjectiveAge(constrained.age);
    
    // KERNEL: Span cost via computeSpanCost
    const costSeconds = mode === 'span'
        ? computeSpanCost({ ts: startWorld.time, arrivalTs: constrained.time })
        : 0;
    const dist = Math.hypot(dx, dy);

    const lines = [
        `<strong>${objDateLines[0]}</strong>`,
        `<span style="color: #aaa;">${objDateLines[1]}</span>`,
        `Age: ${subAgeStr}`
    ];

    if (mode === 'span') {
        // KERNEL: costSeconds already computed above
        const direction = constrained.time > startWorld.time ? "UP" : "DOWN";
        lines.push(`<span style="color: #ff00ff; font-weight: bold;">SPAN ${direction}: ${formatDurationCompact(costSeconds)}</span>`);

        if (graphData.maxSpanPool > 0) {
            // KERNEL: remaining values pre-computed by calculateLifelineCoordinates
            const remainingNow   = graphData.remainingSpanSeconds;
            // KERNEL: remaining after = current remaining minus span cost (both in seconds)
            const remainingAfter = remainingNow - costSeconds;
            const isOverspan     = remainingAfter < 0;

            const remainingNowStr   = formatDurationCompact(Math.max(0, remainingNow));
            const remainingAfterStr = formatDurationCompact(Math.abs(remainingAfter));

            lines.push(`<span style="color: #aaa;">Pool now:   ${remainingNowStr}</span>`);

            if (isOverspan) {
                lines.push(`<span style="color: #ff4444; font-weight: bold;">After: OVERSPAN by ${remainingAfterStr}</span>`);
            } else {
                // Percentage calculation is display logic (color coding threshold),
                // not domain logic. Kernel owns the remaining number; the color
                // band is a UI rendering decision.
                const pct = remainingAfter / graphData.maxSpanPool;
                const col = pct < 0.15 ? '#ff4444' : pct < 0.35 ? '#ff9f43' : '#aaffaa';
                lines.push(`<span style="color: ${col};">After:   ${remainingAfterStr}</span>`);
            }
        }
    } else if (mode === 'level') {
        const dAge = constrained.age - startWorld.age;
        lines.push(`<span style="color: #00ccff; font-weight: bold;">AGING: ${formatDurationCompact(dAge)}</span>`);
    }

    // LEVELLER BLOCK FEEDBACK
    if (spanningRestricted && graphData.spanRank === 0 && Math.abs(dy) > Math.abs(dx) && dist > 10) {
        return {
            lines: [...lines, `<span style="color: #ff4444; font-weight: bold;">SPANNING PROHIBITED: LEVELLER</span>`],
            isWarning: true
        };
    }

    if (!isValid && constrained.age < startWorld.age) {
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