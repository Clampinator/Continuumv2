
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Relationship types that carry a natural direction (source → target).
 * These get an arrowhead marker on the link pointing at the target node.
 */
export const DIRECTED_TYPES = new Set([
    "Mentor", "Student", "Employer", "Employee",
    "Protector", "Parent", "Child", "Informant",
]);

/**
 * Adds SVG <defs> arrowhead markers for each sphere color.
 * Must be called on the <svg> element before renderElements.
 */
export function addArrowMarkers(svg) {
    // context-stroke makes the arrowhead inherit the link's stroke color (Chromium / Electron safe)
    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "rel-arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth",  6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .attr("markerUnits", "userSpaceOnUse")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "context-stroke");
}

// Emoji for each relationship type value. Emoji are OS-rendered and always
// display correctly in SVG text — no font loading dependency.
// Values must match the RELATIONSHIP_GROUPS list in handle-link-edit.js.
const RELATIONSHIP_EMOJIS = {
    "Romantic":   "❤",
    "Spouse":     "❤",
    "BestFriend": "🤝",
    "Confidant":  "🤝",
    "Friend":     "🤝",
    "Ally":       "🤝",
    "Family":     "🏠",
    "Parent":     "🏠",
    "Child":      "🏠",
    "Sibling":    "🏠",
    "Mentor":     "🎓",
    "Student":    "🎓",
    "Protector":  "🛡",
    "Informant":  "👁",
    "Colleague":  "💼",
    "Employer":   "💼",
    "Employee":   "💼",
    "Client":     "💼",
    "Rival":      "⚔",
    "Enemy":      "☠",
    "Nemesis":    "☠",
    "Threat":     "⚡",
};

function getRelationshipEmoji(type) {
    return RELATIONSHIP_EMOJIS[type] ?? null;
}

/**
 * Renders all graph components (nodes, links, groups) into the SVG group.
 * @param {object} g - D3 selection of the main content group.
 * @param {object} data - The assembled graph data package.
 * @returns {object} References to selections for simulation updates and local utility functions.
 */
export function renderElements(g, data) {
    const valueline = d3.line().curve(d3.curveCatmullRomClosed).x(d => d[0]).y(d => d[1]);

    const groupSel = g.append("g").attr("class", "groups")
        .selectAll("path").data(data.groups).join("path")
        .attr("fill", d => d.color)
        .attr("fill-opacity", 0.12)
        .attr("stroke", d => d.color)
        .attr("stroke-width", 65)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-opacity", 0.28)
        .style("pointer-events", "none");

    const linkWrapper = g.append("g").attr("class", "links")
        .selectAll("g").data(data.links).join("g").attr("class", "link-wrapper");

    const linkHit = linkWrapper.append("path")
        .attr("stroke", "transparent").attr("stroke-width", 15).attr("fill", "none").style("cursor", "pointer");

    const linkVisible = linkWrapper.append("path")
        .attr("fill", "none")
        .style("stroke-width", d => (d.visualWidth || 2) + "px")
        .style("stroke", d => d.visualColor || "#555")
        .style("stroke-opacity", d => d.visualOpacity || 0.5)
        .attr("marker-end", d => DIRECTED_TYPES.has(d.relationshipType) ? "url(#rel-arrow)" : null);

    // --- RELATIONSHIP TYPE BADGES ---
    // Emoji badge at each link midpoint. Emoji render via the OS — no font dependency.
    const badgeData = data.links.filter(l => getRelationshipEmoji(l.relationshipType));
    const linkBadgeSel = g.append("g").attr("class", "link-badges")
        .selectAll("g").data(badgeData).join("g")
        .attr("class", "link-badge")
        .style("pointer-events", "none");

    linkBadgeSel.append("circle")
        .attr("r", 11)
        .attr("fill", "#111")
        .attr("fill-opacity", 0.85)
        .attr("stroke", d => d.visualColor || "#555")
        .attr("stroke-width", 1.5);

    linkBadgeSel.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-family", "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif")
        .attr("font-size", "12px")
        .text(d => getRelationshipEmoji(d.relationshipType));

    const nodeSel = g.append("g").attr("class", "nodes")
        .selectAll("g").data(data.nodes).join("g")
        .attr("class", "network-node").attr("data-node-id", d => d.id);

    const getRadius = (d) => d.isRoot ? 35 : 25;

    nodeSel.append("circle").attr("r", d => getRadius(d))
        .attr("fill", "#222").attr("stroke", d => d.isRoot ? "#ffd700" : "#4da6ff")
        .attr("stroke-width", d => d.isRoot ? 3 : 2).style("pointer-events", "all");

    nodeSel.append("clipPath").attr("id", d => `clip-char-${d.id}`).append("circle").attr("r", d => getRadius(d));

    nodeSel.append("image")
        .attr("href", d => d.img).attr("x", d => -getRadius(d)).attr("y", d => -getRadius(d))
        .attr("width", d => getRadius(d) * 2).attr("height", d => getRadius(d) * 2)
        .attr("preserveAspectRatio", "xMidYMid slice").attr("clip-path", d => `url(#clip-char-${d.id})`)
        .style("pointer-events", "none");

    // --- FAVOR BADGE ---
    const favorGroup = nodeSel.filter(d => d.hasFavor).append("g")
        .attr("class", "favor-badge")
        .attr("transform", d => `translate(${getRadius(d) * 0.7}, ${-getRadius(d) * 0.7})`);
    
    favorGroup.append("circle").attr("r", 8).attr("fill", "#ffd700").attr("stroke", "#000").attr("stroke-width", 1);
    favorGroup.append("text").attr("dy", "0.35em").attr("text-anchor", "middle")
        .attr("fill", "#000").attr("font-size", "10px").attr("font-weight", "bold").text("$");

    nodeSel.append("text").attr("dy", d => d.isRoot ? 52 : 42)
        .attr("text-anchor", "middle").attr("fill", "#eee").style("font-size", "12px").style("pointer-events", "none")
        .text(d => d.name);

    return { nodeSel, linkVisible, linkHit, linkBadgeSel, groupSel, valueline, getRadius };
}
