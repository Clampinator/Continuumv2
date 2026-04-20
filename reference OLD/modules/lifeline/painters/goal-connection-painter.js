
const svgNS = "http://www.w3.org/2000/svg";

/**
 * Handles drawing transient connection lines between the Goal HUD and SVG Nodes.
 */
export const GoalConnectionPainter = {
    draw(svg, viewState, graphData) {
        // Find or create the goal connections layer
        let group = svg.querySelector('.graph-goal-connections-layer');
        if (!group) {
            const nodesGroup = svg.querySelector('.graph-nodes-group');
            group = document.createElementNS(svgNS, 'g');
            group.classList.add('graph-goal-connections-layer');

            if (nodesGroup && nodesGroup.parentNode) {
                // Correctly insert before nodesGroup within its actual parent container
                nodesGroup.parentNode.insertBefore(group, nodesGroup);
            } else {
                // Fallback if specific UI layer structure is missing
                svg.appendChild(group);
            }
        }

        group.innerHTML = '';

        if (!viewState.highlightedGoalId || !viewState.hoveredGoalRect) {
            return;
        }

        const goalId = viewState.highlightedGoalId;
        const goalData = graphData.goalNodes.find(g => g.id === goalId);
        if (!goalData) return;

        // 1. Calculate Goal Chip Center in SVG local space
        const svgRect = svg.getBoundingClientRect();
        const goalRect = viewState.hoveredGoalRect;
        
        const goalX = (goalRect.left + goalRect.width / 2) - svgRect.left;
        const goalY = (goalRect.top + goalRect.height / 2) - svgRect.top;

        // 2. Identify linked nodes
        const linkedNodes = graphData.levelNodes.filter(node => 
            node.linkedGoalIds && node.linkedGoalIds.includes(goalId)
        );

        // 3. Define color based on importance (matching HUD chips)
        const colors = {
            "Critical": "#ff6b6b",
            "Extreme": "#ff6b6b",
            "Important": "#ffd93d",
            "Mild": "#a0c4ff",
            "Passing": "#a0c4ff",
            "default": "#ffffff"
        };
        const strokeColor = colors[goalData.importance] || colors.default;

        // 4. Draw Lines
        linkedNodes.forEach(node => {
            const nodeX = (node.age * viewState.scaleX) + viewState.x;
            const nodeY = (node.time * viewState.scaleY) + viewState.y;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', goalX);
            line.setAttribute('y1', goalY);
            line.setAttribute('x2', nodeX);
            line.setAttribute('y2', nodeY);
            line.classList.add('goal-connection-line');
            if (viewState.isGoalLineFading) line.classList.add('fading');
            
            line.setAttribute('stroke', strokeColor);
            group.appendChild(line);
        });
    }
};
