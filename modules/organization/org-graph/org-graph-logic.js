
// continuum/modules/org-graph/org-graph-logic.js
// This file is a bundled copy of the Span Graph logic, adapted for the Organization Sheet.
// Modifications: Renaming IDs, classes, and data field lookups.

// --- CONSTANTS ---
const SECONDS_IN_YEAR = 31536000;
const SECONDS_IN_DAY = 86400;
const MS_IN_DAY = 86400000;
const MS_IN_YEAR = MS_IN_DAY * 365.25;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const svgNS = "http://www.w3.org/2000/svg";

// --- STATE MANAGEMENT ---
const orgSheetContexts = {};

function createDefaultOrgContext() {
    return {
        viewState: {
            x: 0,
            y: 0,
            scaleX: 0.000005,
            scaleY: -0.00000000288, 
            isDragging: false,
            interactionMode: 'pan',
            activeDragType: null,
            lastPointerX: 0,
            lastPointerY: 0,
            dragStartScreenX: 0,
            dragStartScreenY: 0,
            dragStartWorld: { age: 0, time: 0 },
            dragDirection: 'level',
            isDragValid: true,
            creationStartAgeSeconds: 0,
            creationCurrentAgeSeconds: 0,
            initialized: false,
            pointerDownX: 0,
            pointerDownY: 0,
            pointerDownTarget: null, 
            hasMovedSignificantDistance: false,
            hoveredSegment: null,
            lastRenderedView: { x: null, y: null, scaleX: null, scaleY: null },
            dragCurrentX: 0,
            dragCurrentY: 0,
            draggedGoalId: null, // Used for Mandates
            dragTooltip: null, 
            scrubber: { active: false, x: 0, y: 0, worldAge: 0, worldTime: 0 }
        },
        graphData: {
            dobTimestamp: 0,
            nowNode: { age: 0, time: 0, arrivedVia: 'init' },
            levelNodes: [],
            eras: [],
            experiences: [],
            experienceSegments: [],
            goalNodes: [], // Mandates
            remainingSpanSeconds: 0
        }
    };
}

function getOrgSheetContext(sheet) {
    if (!sheet._orgGraphContext) {
        sheet._orgGraphContext = createDefaultOrgContext();
    }
    return sheet._orgGraphContext;
}

// --- UTILS ---
function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

function formatSubjectiveAge(totalSeconds) {
    if (totalSeconds < 0) return "Pre-Inception";
    const years = Math.floor(totalSeconds / SECONDS_IN_YEAR);
    const remainderYear = totalSeconds % SECONDS_IN_YEAR;
    const days = Math.floor(remainderYear / SECONDS_IN_DAY);
    const months = Math.floor(days / 30);
    const remainderDays = days % 30;
    return `${years}y ${months}m ${remainderDays}d`;
}

function formatObjectiveDate(timestamp) {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return ["Invalid", "Date", ""];
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return [`${yyyy}/${mm}/${dd}`, ``, ``]; // Simplified for Orgs? No, keep it standard
}

// --- DATA PROCESSING ---
function processOrgGraphData(sheet, graphData) {
    // 1. Inception Date (DOB equivalent)
    const dobString = sheet.actor.system.structure?.inceptionDate;
    const dobDate = dobString ? new Date(dobString + "T00:00:00") : new Date(NaN);
    graphData.dobTimestamp = !isNaN(dobDate.getTime()) ? dobDate.getTime() : Date.now();

    // Initialize Arrays
    graphData.levelNodes = [{
        age: 0,
        time: graphData.dobTimestamp,
        type: 'origin',
        outgoingType: 'level',
        eventTitle: "Inception",
        eventNotes: sheet.actor.system.structure?.locality || "Founded"
    }];
    graphData.eras = []; // Operations
    graphData.experienceSegments = []; // Methods
    graphData.goalNodes = []; // Mandates

    const rawOps = sheet.actor.system.operations || {};
    
    // Convert Operations to "Ages" logic
    const sortedOps = Object.entries(rawOps)
        .map(([id, op]) => ({ ...op, id }))
        .sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));

    let accumulatedSeconds = 0;
    sortedOps.forEach((op, index) => {
        if (!op.dateFrom) return;
        const d1 = new Date(op.dateFrom + "T00:00:00");
        if (isNaN(d1.getTime())) return;
        
        let durationSeconds = 0;
        let isClosed = true;

        if (op.dateTo) {
            const d2 = new Date(op.dateTo + "T00:00:00");
            if (!isNaN(d2.getTime())) {
                durationSeconds = (d2.getTime() - d1.getTime()) / 1000;
            } else {
                isClosed = false;
            }
        } else {
            isClosed = false;
        }
        
        if (!isClosed) {
            if (index === sortedOps.length - 1) {
                durationSeconds = 31536000 * 1000; // Buffer
            } else {
                durationSeconds = 0;
            }
        }
        if (durationSeconds < 0) durationSeconds = 0;

        const startAgeSeconds = accumulatedSeconds;
        graphData.eras.push({
            id: op.id, 
            name: op.name || "Unnamed Op",
            startAgeSeconds: startAgeSeconds,
            endAgeSeconds: startAgeSeconds + durationSeconds,
            isClosed: isClosed
        });
        
        // Process Methods (Experiences) inside Operations
        const methods = op.methods || {};
        Object.entries(methods).forEach(([mId, method]) => {
            // Visualize methods as segments spanning the whole Op for now, or just placeholders
            // Since methods don't have explicit dates in the template, we default to Op duration
            graphData.experienceSegments.push({
                id: mId,
                eraId: op.id,
                expId: mId,
                name: method.name,
                description: method.description,
                startAge: startAgeSeconds,
                endAge: startAgeSeconds + durationSeconds,
                startTime: d1.getTime(),
                endTime: d1.getTime() + (durationSeconds * 1000),
                isClosed: isClosed
            });
            
            // Process Tasks (Events)
            const tasks = method.tasks || {};
            const sortedTasks = Object.entries(tasks)
                .map(([tId, t]) => ({...t, id: tId}))
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
            sortedTasks.forEach(task => {
                if(task.date) {
                    const taskTs = new Date(`${task.date}T${task.time || '00:00'}`).getTime();
                    // Simple logic: tasks are points on the line. 
                    // Calculate relative age based on task date vs Op start date + accumulated age
                    const relTime = (taskTs - d1.getTime()) / 1000;
                    const nodeAge = startAgeSeconds + relTime;
                    
                    if(relTime >= 0) {
                        graphData.levelNodes.push({
                            age: nodeAge,
                            time: taskTs,
                            type: 'level',
                            outgoingType: 'level',
                            eventId: task.id,
                            eraId: op.id,
                            expId: mId,
                            eventTitle: task.eventTitle || "Task",
                            eventNotes: task.eventNotes || ""
                        });
                    }
                }
            });
        });

        accumulatedSeconds += durationSeconds;
    });

    // Now Node Logic (Last Task)
    if (graphData.levelNodes.length > 0) {
        // Sort nodes by age
        graphData.levelNodes.sort((a,b) => a.age - b.age);
        const lastNode = graphData.levelNodes[graphData.levelNodes.length - 1];
        graphData.nowNode = {
            age: lastNode.age,
            time: lastNode.time,
            arrivedVia: 'level',
            eventTitle: "Current Status",
            eventNotes: ""
        };
    } else {
        graphData.nowNode = { age: 0, time: graphData.dobTimestamp, arrivedVia: 'init' };
    }

    // Process Mandates (Goals)
    const mandates = sheet.actor.system.mandates || {};
    Object.entries(mandates).forEach(([id, m]) => {
        if (m.importance === "Achieved") return;
        graphData.goalNodes.push({
            id: id,
            description: m.description,
            importance: m.importance
        });
    });
}

// --- RENDERING ---
function renderOrgGraph(svg, viewState, graphData) {
    if (!svg || !viewState || !graphData) return;
    const rect = svg.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Grid
    const gridGroup = svg.querySelector('.graph-grid-lines');
    gridGroup.innerHTML = '';
    // (Simplified grid draw for brevity, assumed generic grid logic identical to span graph)
    
    // Eras (Operations)
    const ageLayer = svg.querySelector('.graph-ages-layer');
    ageLayer.innerHTML = '';
    graphData.eras.forEach(age => {
        const startX = (age.startAgeSeconds * viewState.scaleX) + viewState.x;
        const endX = (age.endAgeSeconds * viewState.scaleX) + viewState.x;
        const barWidth = Math.max(0, endX - startX);
        if (barWidth > 0) {
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', startX); rect.setAttribute('y', 0);
            rect.setAttribute('width', barWidth); rect.setAttribute('height', height);
            rect.setAttribute('fill', 'rgba(0, 100, 255, 0.1)');
            rect.setAttribute('stroke', 'rgba(0, 100, 255, 0.4)');
            ageLayer.appendChild(rect);
            
            // Label
            if (barWidth > 20) {
                const label = document.createElementNS(svgNS, 'text');
                label.setAttribute('x', startX + barWidth/2);
                label.setAttribute('y', 20);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', '#4da6ff');
                label.setAttribute('font-size', '11px');
                label.textContent = age.name;
                ageLayer.appendChild(label);
            }
        }
    });

    // Nodes
    const nodesGroup = svg.querySelector('.graph-nodes-group');
    nodesGroup.innerHTML = '';
    
    graphData.levelNodes.forEach(node => {
        const cx = (node.age * viewState.scaleX) + viewState.x;
        const cy = (node.time * viewState.scaleY) + viewState.y;
        
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
        circle.setAttribute('r', 4);
        circle.setAttribute('fill', '#ff00ff');
        circle.setAttribute('stroke', '#fff');
        nodesGroup.appendChild(circle);
    });

    // Now Node
    const nowCx = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
    const nowCy = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
    const nowNode = document.createElementNS(svgNS, 'circle');
    nowNode.setAttribute('cx', nowCx); nowNode.setAttribute('cy', nowCy);
    nowNode.setAttribute('r', 6);
    nowNode.classList.add('graph-node-now'); // CSS handles styling/pulse
    nodesGroup.appendChild(nowNode);
}

// --- INITIALIZATION ---
export function initializeOrgGraph(html, sheet) {
    const svg = html.find('.org-graph-svg')[0];
    if (!svg) return;

    // Map Background (Reuse existing map logic but target different ID)
    const mapContainer = html.find('#org-lifeline-map-background')[0];
    // Note: Orgs usually don't have birthLat/Lng in the same way, but if they did...
    // For now, we skip map init or pass 0,0
    
    const context = getOrgSheetContext(sheet);
    
    processOrgGraphData(sheet, context.graphData);
    
    // Initial Fit
    if (!context.viewState.initialized) {
        // Basic fit logic
        context.viewState.initialized = true;
        context.viewState.x = 50;
        context.viewState.y = 250;
    }

    renderOrgGraph(svg, context.viewState, context.graphData);

    // Attach Listeners (Simplified for copy - Pan/Zoom)
    let isDown = false;
    let startX, startY, viewStartX, viewStartY;

    svg.addEventListener('pointerdown', (e) => {
        isDown = true;
        startX = e.clientX;
        startY = e.clientY;
        viewStartX = context.viewState.x;
        viewStartY = context.viewState.y;
        svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        context.viewState.x = viewStartX + dx;
        context.viewState.y = viewStartY + dy;
        requestAnimationFrame(() => renderOrgGraph(svg, context.viewState, context.graphData));
    });

    svg.addEventListener('pointerup', (e) => {
        isDown = false;
        svg.releasePointerCapture(e.pointerId);
    });

    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        context.viewState.scaleX *= zoom;
        context.viewState.scaleY *= zoom;
        requestAnimationFrame(() => renderOrgGraph(svg, context.viewState, context.graphData));
    });
}
