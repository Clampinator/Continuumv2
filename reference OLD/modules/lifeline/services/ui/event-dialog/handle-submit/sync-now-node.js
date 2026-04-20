/**
 * Synchronizes the actor's "Now" cursor to the event's position if in log mode.
 * @param {object} params - { mode, finalAge, finalTime }
 * @param {object} updates
 */
export function syncNowNode(params, updates) {
    const { mode, finalAge, finalTime } = params;
    if (mode === 'log') {
        updates['system.personal.subjectiveNow'] = finalAge;
        updates['system.personal.objectiveNow'] = finalTime;
    }
}
