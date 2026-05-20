import { getGraphDebugData } from './span-graph-container.js';
import { fitGraphToView } from './viewport-controller.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { getSheetContext } from './graph-state.js';
import { processGraphData } from './span-graph-data-processor.js';
import { renderGraph } from './span-graph-render.js';

export async function handleDebugGraphDataClick(sheet, event) {
    event.preventDefault();
    const actor = sheet.actor;
    const graphDebug = getGraphDebugData(sheet);
    const nodes = graphDebug.graphData.levelNodes || [];

    const timelineEntries = nodes.map(node => {
        let entry = {
            eventId: node.eventId,
            type: node.type,
            subjectiveAge: { seconds: node.world.age, formatted: formatSubjectiveAge(node.world.age) },
            objectiveTime: { timestamp: node.world.time, iso: new Date(node.world.time).toISOString() },
            data: {}
        };
        if (node.eraId && node.expId && node.eventId) {
            const evt = actor.system.eras[node.eraId]?.experiences[node.expId]?.events[node.eventId];
            if (evt) entry.rawEventData = evt;
        }
        return entry;
    });

    const exportData = {
        meta: { characterName: actor.name, exportDate: new Date().toISOString() },
        computedTimeline: timelineEntries,
        rawStructure: actor.system.eras
    };

    try {
        await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        ui.notifications.info(`Debug Graph Data for ${actor.name} copied to clipboard!`);
    } catch (err) {
        ui.notifications.error("Failed to copy data to clipboard.");
    }
}

export function handleResetGraphViewClick(sheet, event) {
    event.preventDefault();
    const svg = sheet.element.find('.span-graph-svg')[0];
    if (!svg) return;
    const { viewState, graphData } = getSheetContext(sheet);
    if (graphData && viewState) fitGraphToView(svg, viewState, graphData);
}

export async function handleFixRailOffsetsClick(sheet, event) {
    event.preventDefault();
    const actor = sheet.actor;
    const system = actor.system;
    const updates = {};
    let count = 0;

    for (const [eraId, era] of Object.entries(system.eras || {})) {
        for (const [eventId, evt] of Object.entries(era.events || {})) {
            if (evt.eventIsSpan && evt.eventTitle === "Reconciliation Loop") {
                updates[`system.eras.${eraId}.events.-=${eventId}`] = null;
                count++;
            }
        }
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, evt] of Object.entries(exp.events || {})) {
                if (evt.eventIsSpan && evt.eventTitle === "Reconciliation Loop") {
                    updates[`system.eras.${eraId}.experiences.${expId}.events.-=${eventId}`] = null;
                    count++;
                }
            }
        }
    }

    if (count === 0) {
        ui.notifications.info("No Reconciliation Loops found — rail is already clean.");
        return;
    }

    await actor.update(updates);

    const { viewState, graphData } = getSheetContext(sheet);
    const svg = sheet.element.find('.span-graph-svg')[0];
    if (svg && viewState && graphData) {
        processGraphData(sheet, graphData);
        renderGraph(svg, viewState, graphData);
    }

    ui.notifications.info(`Cleared ${count} Reconciliation Loop(s). Lifeline rail rebuilt.`);
}

export async function handleTimelineSortToggle(sheet, event) {
    event.preventDefault();
    const currentDir = sheet.actor.getFlag('continuum-v2', 'timelineSortDirection') || 'desc';
    await sheet.actor.setFlag('continuum-v2', 'timelineSortDirection', currentDir === 'desc' ? 'asc' : 'desc');
}
