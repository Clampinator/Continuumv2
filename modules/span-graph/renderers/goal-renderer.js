/**
 * DUMB RENDERER: GOAL RENDERER
 * Draws dotted connection lines from a hovered goal chip to its linked event nodes.
 * Lines are only visible while the goal chip is hovered (viewState.highlightedGoalId).
 *
 * RECIPIES: goalNodes from manifest, linkedGoalIds on each node.
 * NO domain logic - only SVG drawing from screen coordinates.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const IMPORTANCE_COLORS = {
    'Critical': '#ff6b6b',
    'Extreme': '#ff6b6b',
    'Important': '#ffd93d',
    'Mild': '#a0c4ff',
    'Passing': '#a0c4ff',
    'default': '#ffffff'
};

export class GoalRenderer {
    constructor(viewport, parentGroup) {
        this.viewport = viewport;
        this.group = this._createGoalGroup(parentGroup);
    }

    /**
     * Renders dotted goal connection lines from the hovered goal chip position
     * to all linked event nodes.
     *
     * @param {Object} manifest - The RenderManifest with nodes containing linkedGoalIds.
     * @param {Object|null} goalState - { goalId, goalScreenPos, goalImportance } or null to clear.
     */
    render(manifest, goalState) {
        if (!this.group) return;
        this.group.innerHTML = '';

        if (!goalState || !goalState.goalId || !goalState.goalScreenPos) return;

        const { goalId, goalScreenPos, goalImportance } = goalState;
        const linkedNodes = manifest.nodes.filter(n =>
            n.linkedGoalIds && n.linkedGoalIds.includes(goalId)
        );

        if (linkedNodes.length === 0) return;

        const strokeColor = IMPORTANCE_COLORS[goalImportance] || IMPORTANCE_COLORS.default;

        linkedNodes.forEach(node => {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', goalScreenPos.x);
            line.setAttribute('y1', goalScreenPos.y);
            line.setAttribute('x2', node.x);
            line.setAttribute('y2', node.y);
            line.setAttribute('stroke', strokeColor);
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-dasharray', '4, 3');
            line.setAttribute('fill', 'none');
            line.classList.add('goal-connection-line');

            // Fading animation when mouse leaves the goal chip
            if (goalState.isFading) {
                line.classList.add('fading');
            }

            this.group.appendChild(line);
        });
    }

    _createGoalGroup(parent) {
        if (typeof document === 'undefined') return null;
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'span-graph-goal-connections');
        parent.appendChild(g);
        return g;
    }
}