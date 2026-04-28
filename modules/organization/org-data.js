
// continuum/modules/org-data.js

import { SECONDS_IN_YEAR } from '../span-graph-utils.js';

const UNIT_COLORS = {
    physical: '#E32017',   // Red
    espionage: '#003688',  // Blue
    psyops: '#9B0056',     // Purple
    online: '#00782A',     // Green
    hq: '#D4AF37'          // Gold
};

export function processOrgData(sheet, graphData, viewState) {
    // 1. Reference Date (Inception)
    const dobString = sheet.actor.system.structure?.inceptionDate;
    const dobDate = dobString ? new Date(dobString + "T00:00:00") : new Date(NaN);
    
    // Default to Date.now() if invalid or missing to ensure valid Time axis position
    graphData.dobTimestamp = !isNaN(dobDate.getTime()) ? dobDate.getTime() : Date.now();
    const inceptionTime = graphData.dobTimestamp;

    // 2. Initialize Arrays & Objects
    graphData.levelNodes = []; // All nodes flat list
    graphData.eras = [];
    graphData.experienceSegments = []; 
    graphData.yetNodes = []; 
    graphData.tracks = {}; // { unitId: { id, name, type, color, nodes: [], head: {} } }
    
    // 3. Initialize Tracks from Conflict Units
    // HQ Track (Default)
    graphData.tracks['hq'] = {
        id: 'hq',
        name: 'Headquarters',
        type: 'hq',
        color: UNIT_COLORS.hq,
        nodes: []
    };

    const conflict = sheet.actor.system.conflict || {};
    const processUnits = (category, type) => {
        if (!conflict[category]) return;
        Object.entries(conflict[category]).forEach(([id, unit]) => {
            graphData.tracks[id] = {
                id: id,
                name: unit.description || unit.role || unit.type || "Unnamed Unit",
                type: type,
                color: UNIT_COLORS[type] || '#888',
                nodes: []
            };
        });
    };

    processUnits('physical', 'physical');
    processUnits('espionage', 'espionage');
    processUnits('psyops', 'psyops');
    processUnits('online', 'online');

    // 4. Process Phases & Operations (Visual Blocks)
    const phases = sheet.actor.system.phases || {};
    const allEngagements = [];

    Object.entries(phases).forEach(([phaseId, phase]) => {
        const pStart = new Date(phase.dateFrom).getTime();
        const pEnd = phase.dateTo ? new Date(phase.dateTo).getTime() : null; 
        
        let startAge = 0;
        let endAge = 0;
        let isClosed = false;

        if (!isNaN(pStart)) {
            startAge = (pStart - inceptionTime) / 1000;
            if (pEnd) {
                endAge = (pEnd - inceptionTime) / 1000;
                isClosed = true;
            } else {
                endAge = startAge + (SECONDS_IN_YEAR * 100); 
                isClosed = false;
            }
            
            graphData.eras.push({
                id: phaseId,
                name: phase.name || "Unnamed Phase",
                startAgeSeconds: Math.max(0, startAge),
                endAgeSeconds: Math.max(0, endAge),
                isClosed: isClosed
            });

            // Operations
            const ops = phase.operations || {};
            Object.entries(ops).forEach(([opId, op]) => {
                const oStart = new Date(op.dateFrom).getTime();
                const oEnd = op.dateTo ? new Date(op.dateTo).getTime() : null;
                
                if (!isNaN(oStart)) {
                    const opStartAge = (oStart - inceptionTime) / 1000;
                    const opEndAge = oEnd ? (oEnd - inceptionTime) / 1000 : opStartAge + (SECONDS_IN_YEAR * 50);
                    
                    graphData.experienceSegments.push({
                        id: opId,
                        expId: opId, 
                        eraId: phaseId,
                        name: op.name || "Op",
                        description: op.description || "",
                        startAge: Math.max(0, opStartAge),
                        startTime: oStart,
                        endAge: Math.max(0, opEndAge),
                        endTime: oEnd || (oStart + (SECONDS_IN_YEAR * 1000 * 50)),
                        isClosed: !!oEnd
                    });

                    // Collect Engagements
                    const engs = op.engagements || {};
                    Object.entries(engs).forEach(([engId, eng]) => {
                        allEngagements.push({
                            ...eng,
                            id: engId,
                            phaseId: phaseId,
                            opId: opId
                        });
                    });
                }
            });
        }
    });

    graphData.eras.sort((a,b) => a.startAgeSeconds - b.startAgeSeconds);

    // 5. Build Nodes and Assign to Tracks
    
    // Sort All Engagements Chronologically
    allEngagements.sort((a, b) => {
        const tA = new Date((a.date || "") + "T" + (a.time || "00:00")).getTime();
        const tB = new Date((b.date || "") + "T" + (b.time || "00:00")).getTime();
        return tA - tB;
    });

    // Create Start Node for Every Track (At Inception)
    Object.values(graphData.tracks).forEach(track => {
        const originNode = {
            age: 0,
            time: inceptionTime,
            type: 'origin',
            outgoingType: 'level',
            eventTitle: `${track.name} Active`,
            trackId: track.id,
            // Headquarters lat/lng
            lat: sheet.actor.system.structure?.headquartersLat,
            lng: sheet.actor.system.structure?.headquartersLng,
            zoom: 12
        };
        track.nodes.push(originNode);
        graphData.levelNodes.push(originNode); // Keep in flat list for hit detection
    });

    // Process Engagements into Nodes
    allEngagements.forEach(eng => {
        const dateStr = `${eng.date}T${eng.time || '00:00'}`;
        const ts = new Date(dateStr).getTime();
        
        if (!isNaN(ts)) {
            const ageSeconds = (ts - inceptionTime) / 1000;
            
            // Determine which track this belongs to
            // Check 'eng.unitId'. If missing or not found, default to 'hq'
            let trackId = eng.unitId && graphData.tracks[eng.unitId] ? eng.unitId : 'hq';
            
            const node = {
                age: ageSeconds,
                time: ts,
                type: 'level',
                outgoingType: 'level',
                eventId: eng.id,
                eraId: eng.phaseId,
                expId: eng.opId,
                eventTitle: eng.name || "Engagement",
                eventNotes: eng.description,
                trackId: trackId,
                // Location data
                lat: eng.eventSpanFromLat || null,
                lng: eng.eventSpanFromLng || null,
                zoom: eng.eventSpanFromZoom || null
            };

            graphData.levelNodes.push(node);
            graphData.tracks[trackId].nodes.push(node);
        }
    });

    // 6. Calculate Heads (Now Node) for EACH Track
    Object.values(graphData.tracks).forEach(track => {
        if (track.nodes.length > 0) {
            const last = track.nodes[track.nodes.length - 1];
            track.head = {
                age: last.age,
                time: last.time,
                eventTitle: "Current Status",
                trackId: track.id
            };
        } else {
            // Fallback for tracks with no history: default to Inception time
            track.head = { age: 0, time: inceptionTime, eventTitle: "Inactive", trackId: track.id };
        }
    });

    // 7. Global "Now" (Active Unit or HQ)
    // If viewState has an activeUnitId, use that. Otherwise HQ.
    const activeTrackId = (viewState.activeUnitId && graphData.tracks[viewState.activeUnitId]) ? viewState.activeUnitId : 'hq';
    viewState.activeUnitId = activeTrackId; // Enforce valid ID
    
    // Set the global "nowNode" to the active track's head for standard tools (like Yet creation) to reference
    graphData.nowNode = graphData.tracks[activeTrackId].head;

    // 8. Yet Processing (Standard)
    const rawYets = sheet.actor.system.theYet || {};
    let floatingCount = 0;
    const currentHeadTime = graphData.nowNode.time;
    const currentHeadAge = graphData.nowNode.age;

    Object.entries(rawYets).forEach(([id, yet]) => {
        if (yet.done) return;

        let worldAge = 0;
        let worldTime = 0;
        let relativeAgeOffset = null;
        const hasAge = !!yet.age;
        const hasDate = !!yet.date;
        let driftType = 'none';

        if (hasAge && !hasDate) {
            worldAge = parseFloat(yet.age) * SECONDS_IN_YEAR;
            worldTime = currentHeadTime; 
            driftType = 'y';
        } else if (!hasAge && hasDate) {
            const timeStr = yet.time || "12:00:00";
            const dt = new Date(`${yet.date}T${timeStr}`);
            worldTime = !isNaN(dt.getTime()) ? dt.getTime() : inceptionTime;
            const offset = (SECONDS_IN_YEAR * 0.5) + (floatingCount * SECONDS_IN_YEAR * 0.1); 
            relativeAgeOffset = offset;
            worldAge = currentHeadAge + offset;
            driftType = 'x';
            floatingCount++;
        } else if (hasAge && hasDate) {
            worldAge = parseFloat(yet.age) * SECONDS_IN_YEAR;
            const timeStr = yet.time || "12:00:00";
            const dt = new Date(`${yet.date}T${timeStr}`);
            worldTime = !isNaN(dt.getTime()) ? dt.getTime() : inceptionTime;
            driftType = 'none';
        } else {
            const offset = (SECONDS_IN_YEAR * 0.5) + (floatingCount * SECONDS_IN_YEAR * 0.1); 
            relativeAgeOffset = offset;
            worldAge = currentHeadAge + offset;
            worldTime = currentHeadTime;
            driftType = 'xy';
            floatingCount++;
        }

        graphData.yetNodes.push({
            id: id,
            description: yet.description,
            age: worldAge,
            time: worldTime,
            isLocked: (hasAge || hasDate),
            relativeAgeOffset: relativeAgeOffset,
            driftType: driftType,
            isFragSuppressed: !!yet.isFragSuppressed
        });
    });

    // 9. Mandates
    const mandates = sheet.actor.system.mandates || {};
    Object.entries(mandates).forEach(([id, m]) => {
        if (m.importance !== "Achieved") {
            graphData.goalNodes.push({ id, description: m.description, importance: m.importance });
        }
    });
}
