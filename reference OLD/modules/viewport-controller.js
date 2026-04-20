// continuum/modules/span-graph-viewport.js
import { renderGraph } from './span-graph-render.js';

/**
 * Fits the graph view to show all data nodes within the SVG viewport.
 */
export function fitGraphToView(svg, viewState, graphData) {
    if (!svg || !viewState || !graphData) return;

    // 1. Calculate Bounds based on ALL nodes (history + current head)
    let minAge = 0;
    let maxAge = 0;
    let minTime = graphData.dobTimestamp;
    let maxTime = graphData.dobTimestamp;

    const allNodes = [...graphData.levelNodes];
    if (graphData.nowNode) allNodes.push(graphData.nowNode);

    if (allNodes.length > 0) {
        minAge = Math.min(...allNodes.map(n => n.age));
        maxAge = Math.max(...allNodes.map(n => n.age));
        minTime = Math.min(...allNodes.map(n => n.time));
        maxTime = Math.max(...allNodes.map(n => n.time));
    }

    // Ensure non-zero range to prevent division by zero
    if (Math.abs(maxAge - minAge) < 1) maxAge = minAge + 31536000; 
    if (Math.abs(maxTime - minTime) < 1000) maxTime = minTime + 31536000000;

    const dataWidth = maxAge - minAge;
    const dataHeight = maxTime - minTime;

    // 2. Get Screen Dimensions
    const rect = svg.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const padding = 80; // Increased padding for readability
    const availWidth = width - (padding * 2);
    const availHeight = height - (padding * 2);

    if (availWidth <= 0 || availHeight <= 0) return;

    // 3. Calculate Scale with Fixed Progression Aspect Ratio
    // 1:1 World Ratio = 1s Subjective Age vs 1000ms Objective Time.
    // Target Visual Slope: ~30 degrees.
    // Tan(30) ≈ 0.577. 
    // Thus: (1000ms * |scaleY|) / (1s * scaleX) = 0.577
    const TARGET_RATIO = -0.00045; // Tuned for a 30-ish degree visual sweep

    const scaleX_w = availWidth / dataWidth;
    const scaleX_h = availHeight / (dataHeight * Math.abs(TARGET_RATIO));

    // Fit to the smaller scale (most inclusive)
    let newScaleX = Math.min(scaleX_w, scaleX_h);
    
    // Final NaN / Infinity check before applying
    if (!Number.isFinite(newScaleX) || newScaleX <= 0) newScaleX = 0.000005;
    newScaleX = Math.min(newScaleX, 0.00008); // Cap zoom

    const newScaleY = newScaleX * TARGET_RATIO;

    // 4. Calculate Pan (Centering)
    const centerAge = (minAge + maxAge) / 2;
    const centerTime = (minTime + maxTime) / 2;
    const screenCenterX = width / 2;
    const screenCenterY = height / 2;

    const newX = screenCenterX - (centerAge * newScaleX);
    const newY = screenCenterY - (centerTime * newScaleY);

    // 5. Apply and Render
    viewState.scaleX = newScaleX;
    viewState.scaleY = newScaleY;
    viewState.x = Number.isFinite(newX) ? newX : width / 2;
    viewState.y = Number.isFinite(newY) ? newY : height / 2;

    renderGraph(svg, viewState, graphData);
}