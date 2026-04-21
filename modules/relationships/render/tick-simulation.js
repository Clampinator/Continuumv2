
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { DIRECTED_TYPES } from './render-elements.js';

/**
 * Updates positions of all visual elements during physics simulation ticks.
 * @param {object} renderRefs - Collection of visual elements and helpers from renderElements.
 */
export function tickSimulation(renderRefs) {
    const { nodeSel, linkVisible, linkHit, linkBadgeSel, groupSel, valueline, getRadius } = renderRefs;

    nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);

    const updateLink = (sel, isHit = false) => {
        sel.attr("d", d => {
            const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);
            // Directed links get extra clearance so the arrowhead tip lands at the node edge
            const arrowPad = (!isHit && DIRECTED_TYPES.has(d.relationshipType)) ? 10 : 0;
            const r = getRadius(d.target) + 2 + arrowPad;
            if (dr === 0) return "";
            return `M${d.source.x},${d.source.y}L${d.target.x - (dx*r/dr)},${d.target.y - (dy*r/dr)}`;
        });
    };
    updateLink(linkVisible, false);
    updateLink(linkHit, true);

    // Position each relationship badge at the midpoint of its link
    if (linkBadgeSel) {
        linkBadgeSel.attr("transform", d => {
            const mx = (d.source.x + d.target.x) / 2;
            const my = (d.source.y + d.target.y) / 2;
            return `translate(${mx},${my})`;
        });
    }

    groupSel.attr("d", d => {
        const members = d.members.filter(n => n.x != null && n.y != null);
        if (members.length === 0) return null;

        const pad = 55; // pixels to push hull outward from each node centre

        if (members.length === 1) {
            const { x, y } = members[0];
            const r = pad + 30;
            // Circular path for solo member
            return `M ${x},${y - r} A ${r},${r} 0 1,0 ${x},${y + r} A ${r},${r} 0 1,0 ${x},${y - r} Z`;
        }

        const points = members.map(n => [n.x, n.y]);
        const hull = d3.polygonHull(points) || points;

        // Centroid of hull
        const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
        const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;

        // Push each hull vertex outward from centroid
        const padded = hull.map(([px, py]) => {
            const dx = px - cx, dy = py - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            return [px + (dx / dist) * pad, py + (dy / dist) * pad];
        });

        return valueline(padded);
    });
}
