import { formatObjectiveDateLines } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';

// DEVELOPMENT ONLY: Debug overlay for node labels.
// TTL imports remain here because this is a debug overlay, not a production renderer.
// If re-enabled, format calls should be moved to the orchestrator layer.
/**
 * DEBUG AUTHORITY: Persistent Node Labels.
 * Draws internal array indices and physical coordinates over the graph.
 */
export function drawDebugNodeLabels(svg, viewState, graphData) {
    const svgNS = "http://www.w3.org/2000/svg";

    // 1. Resolve Layer
    let debugLayer = svg.querySelector('.graph-debug-labels-layer');
    if (!debugLayer) {
        debugLayer = document.createElementNS(svgNS, 'g');
        debugLayer.classList.add('graph-debug-labels-layer');
        const uiLayer = svg.querySelector('.graph-ui-layer');
        if (uiLayer) {
            uiLayer.parentNode.insertBefore(debugLayer, uiLayer);
        } else {
            svg.appendChild(debugLayer);
        }
    }

    // 2. Clear Previous
    debugLayer.innerHTML = '';

    // 3. Draw Overlays for History
    graphData.levelNodes.forEach((node, index) => {
        const x = (node.age * viewState.scaleX) + viewState.x;
        const y = (node.time * viewState.scaleY) + viewState.y;

        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const dateLines = formatObjectiveDateLines(node.time);
        const ageStr = formatSubjectiveAge(node.age);

        const labelGroup = document.createElementNS(svgNS, 'text');
        labelGroup.setAttribute('x', x + 10);
        labelGroup.setAttribute('y', y - 10);
        labelGroup.setAttribute('fill', '#00ff00');
        labelGroup.setAttribute('font-size', '9px');
        labelGroup.setAttribute('font-family', 'monospace');
        labelGroup.style.pointerEvents = 'none';
        labelGroup.style.textShadow = '1px 1px 2px black';

        const tIdx = document.createElementNS(svgNS, 'tspan');
        tIdx.textContent = `[PROG: ${index}] ${node.type.toUpperCase()}`;
        tIdx.setAttribute('x', x + 10);
        tIdx.setAttribute('dy', '0');
        tIdx.style.fontWeight = 'bold';

        const tAge = document.createElementNS(svgNS, 'tspan');
        tAge.textContent = `AGE: ${ageStr}`;
        tAge.setAttribute('x', x + 10);
        tAge.setAttribute('dy', '1.2em');

        const tDate = document.createElementNS(svgNS, 'tspan');
        tDate.textContent = `OBJ: ${dateLines[0]} ${dateLines[1]}`;
        tDate.setAttribute('x', x + 10);
        tDate.setAttribute('dy', '1.2em');

        const tCreate = document.createElementNS(svgNS, 'tspan');
        tCreate.textContent = `ADR: ${node.sort || 'GENESIS'}`;
        tCreate.setAttribute('x', x + 10);
        tCreate.setAttribute('dy', '1.2em');
        tCreate.style.fill = '#00ffff';

        labelGroup.appendChild(tIdx);
        labelGroup.appendChild(tAge);
        labelGroup.appendChild(tDate);
        labelGroup.appendChild(tCreate);
        debugLayer.appendChild(labelGroup);
    });

    // 4. Handle "Now" Node separately
    if (graphData.nowNode) {
        const nx = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
        const ny = (graphData.nowNode.time * viewState.scaleY) + viewState.y;

        if (Number.isFinite(nx) && Number.isFinite(ny)) {
            const nowLabel = document.createElementNS(svgNS, 'text');
            nowLabel.setAttribute('x', nx + 12);
            nowLabel.setAttribute('y', ny + 5);
            nowLabel.setAttribute('fill', '#ffff00');
            nowLabel.setAttribute('font-size', '10px');
            nowLabel.setAttribute('font-family', 'monospace');
            nowLabel.style.fontWeight = 'bold';
            nowLabel.style.textShadow = '1px 1px 3px black';
            nowLabel.textContent = `<<< [HEAD] Age: ${formatSubjectiveAge(graphData.nowNode.age)}`;
            debugLayer.appendChild(nowLabel);
        }
    }
}