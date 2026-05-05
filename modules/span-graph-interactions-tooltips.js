import { timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { ExperienceTooltipService } from './lifeline/services/ui/experience-tooltip-service.js';

export function attachTooltipListeners(svg, graphData, actor) {
    const tooltipGroup = svg.querySelector('.graph-tooltip-group');
    if (!tooltipGroup) return;
    const tooltipText = tooltipGroup.querySelector('.tooltip-text');
    const tooltipRect = tooltipGroup.querySelector('.tooltip-bg');
    const svgNS = "http://www.w3.org/2000/svg";

    svg.addEventListener('pointerover', (event) => {
        const target = event.target;

        // --- 0. AGGRESSIVE HIDE: If not hovering an interactive element, clear tooltips ---
        const isInteractive = target.classList.contains('graph-exp-label') ||
                             target.classList.contains('graph-experience-rect') ||
                             target.classList.contains('graph-element-interactive') ||
                             target.classList.contains('graph-node-now') ||
                             target.classList.contains('graph-node-yet') ||
                             target.classList.contains('graph-node-satellite') ||
                             target.hasAttribute('data-index');

        if (!isInteractive) {
            ExperienceTooltipService.hide();
            tooltipGroup.style.display = 'none';
            return;
        }

        // --- 1. SPECIAL CASE: EXPERIENCE LABELS AND RECTS ---
        if (target.classList.contains('graph-exp-label') || target.classList.contains('graph-experience-rect')) {
            ExperienceTooltipService.show(actor, target, event);
            return;
        }

        let data = null;
        let isNow = false;
        let isYet = false;
        let isSatellite = false;
        let goalText = "";

        // --- 2. DATA IDENTIFICATION ---
        if (target.classList.contains('graph-node-now')) {
            data = {
                ...graphData.nowNode,
                eventTitle: "Subjective Now",
                eventNotes: "The leading edge of your timeline."
            };
            isNow = true;
        } else if (target.hasAttribute('data-index')) {
            const index = parseInt(target.getAttribute('data-index'), 10);
            data = graphData.levelNodes[index];
        } else if (target.classList.contains('graph-node-yet')) {
            const desc = target.getAttribute('data-yet-desc');
            isYet = true;
            goalText = desc;
        } else if (target.classList.contains('graph-node-satellite')) {
            const goalId = target.getAttribute('data-goal-id');
            const goal = graphData.goalNodes.find(g => g.id === goalId);
            if (goal) {
                goalText = goal.description;
                isSatellite = true;
            }
        } 

        if (data || isYet || isSatellite) {
            tooltipGroup.style.display = 'block';
            tooltipText.innerHTML = '';
            
            const lines = [];

            // A. High Fidelity Chronology (Header)
            if (data) {
                const ageStr = formatSubjectiveAge(data.eventAge);
                const dt = timestampToDateString(data.eventTime);
                const dateFull = `${dt.date} ${dt.time}`;
                
                lines.push({ 
                    text: dateFull, 
                    fill: isNow ? '#ffd700' : '#00ccff', 
                    weight: 'bold', 
                    size: '10px' 
                });
                
                // B. Tactical Information (Body)
                const eventTitle = data.eventTitle || (data.type?.startsWith('span') ? 'Span Segment' : 'Lifeline Node');
                lines.push({ 
                    text: `${ageStr} — ${eventTitle}`, 
                    fill: '#fff', 
                    weight: 'bold', 
                    size: '12px' 
                });

                // C. Narrative Context Climbing (Footer)
                const ageName = actor.system.eras?.[data.eraId]?.name || "Unknown Era";
                const expName = actor.system.eras?.[data.eraId]?.experiences?.[data.expId]?.name;
                const context = expName ? `${ageName} > ${expName}` : ageName;
                
                lines.push({ 
                    text: context, 
                    fill: '#aaa', 
                    style: 'italic', 
                    size: '10px' 
                });
            } else {
                // Formatting for Yet/Satellite nodes
                const prefix = isYet ? "THE YET: " : "LINKED GOAL: ";
                lines.push({ 
                    text: prefix + goalText, 
                    fill: isYet ? '#ff9f43' : '#ffd93d', 
                    weight: 'bold', 
                    size: '11px' 
                });
            }

            // --- 3. RENDER TSPANS ---
            lines.forEach((line, i) => {
                const tspan = document.createElementNS(svgNS, 'tspan');
                tspan.textContent = line.text;
                tspan.setAttribute('x', 5);
                tspan.setAttribute('dy', i === 0 ? '1em' : '1.2em');
                
                if (line.fill) tspan.setAttribute('fill', line.fill);
                if (line.weight) tspan.setAttribute('font-weight', line.weight);
                if (line.size) tspan.setAttribute('font-size', line.size);
                if (line.style) tspan.setAttribute('font-style', line.style);
                
                tooltipText.appendChild(tspan);
            });

            // --- 4. POSITIONING AND STYLING ---
            const bbox = tooltipText.getBBox();
            tooltipRect.setAttribute('width', bbox.width + 10);
            tooltipRect.setAttribute('height', bbox.height + 10);
            tooltipRect.setAttribute('x', bbox.x - 5);
            tooltipRect.setAttribute('y', bbox.y - 5);

            // Set Border Color matching node type
            let borderColor = "#00ccff"; // Default Leveling (Cyan)
            if (isNow) borderColor = "#ffd700"; // Gold
            else if (data?.type?.startsWith('span')) borderColor = "#ff00ff"; // Magenta
            else if (isYet) borderColor = "#ff9f43";
            else if (isSatellite) borderColor = "#ffd93d";

            tooltipRect.setAttribute('stroke', borderColor);
            tooltipRect.setAttribute('stroke-width', '1.5');
            tooltipRect.setAttribute('fill', 'rgba(10, 10, 15, 0.95)');

            let nx = 0, ny = 0;
            if (target.tagName === 'circle') {
                nx = parseFloat(target.getAttribute('cx'));
                ny = parseFloat(target.getAttribute('cy'));
            } else if (target.tagName === 'rect') {
                nx = parseFloat(target.getAttribute('x')) + (parseFloat(target.getAttribute('width')) / 2);
                ny = parseFloat(target.getAttribute('y')) + (parseFloat(target.getAttribute('height')) / 2);
            } else if (target.tagName === 'polygon' || target.tagName === 'path') {
                // Fallback for complex shapes
                const clientRect = target.getBoundingClientRect();
                const svgRect = svg.getBoundingClientRect();
                nx = (clientRect.left + clientRect.width / 2) - svgRect.left;
                ny = (clientRect.top + clientRect.height / 2) - svgRect.top;
            }
            
            if (!isNaN(nx) && !isNaN(ny)) {
                // Float tooltip above node
                const yOffset = -bbox.height - 20;
                tooltipGroup.setAttribute('transform', `translate(${nx}, ${ny + yOffset})`);
            }
        }
    });

    svg.addEventListener('pointermove', (event) => {
        if (event.target.classList.contains('graph-exp-label') || event.target.classList.contains('graph-experience-rect')) {
            ExperienceTooltipService.updatePosition(event);
        }
    });

    svg.addEventListener('pointerout', (event) => {
        const t = event.target;
        if (t.classList.contains('graph-exp-label') || t.classList.contains('graph-experience-rect')) {
            ExperienceTooltipService.hide();
        }
        
        // Hide SVG tooltip if leaving any interactive element
        if (t.classList.contains('graph-element-interactive') || 
            t.classList.contains('graph-node-now') || 
            t.classList.contains('graph-node-yet') || 
            t.classList.contains('graph-node-satellite') ||
            t.hasAttribute('data-index')) {
            tooltipGroup.style.display = 'none';
        }
    });
}
