import { calculateSegments } from '../../../temporal-engine/calculate-segments.js';
import { resolveCoordinates } from '../../../temporal-engine/resolve-coordinates.js';
import { ReferenceResolver } from '../reference-resolver.js';

/**
 * TEMPORAL RECONCILER (The Ultimate Authority)
 * Resolves proposed changes to a character's lifeline by walking the entire physical
 * journey and generating a complete, synchronized set of database updates.
 */
export const TemporalReconciler = {
    /**
     * Reconciles an edit or insertion.
     * @param {Actor} actor - The character actor.
     * @param {Object} proposedNode - The new/edited node data {id, age, ts, isSpan, ...}.
     * @param {Object} options - { mode: 'edit'|'insert'|'log' }
     * @returns {Object} updates - Dot-path updates for the database.
     */
    reconcile(actor, proposedNode, options = {}) {
        const updates = {};
        const dobTs = ReferenceResolver.resolveOrigin(actor);
        
        // 1. Gather all existing events EXCEPT the one being replaced
        const rawEras = actor.system.eras || {};
        const history = [];

        Object.entries(rawEras).forEach(([eraId, era]) => {
            Object.entries(era.events || {}).forEach(([id, ev]) => {
                if (id === proposedNode.id) return;
                history.push({ ...ev, id, eraId, expId: null, path: `system.eras.${eraId}.events.${id}` });
            });
            Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
                Object.entries(exp.events || {}).forEach(([id, ev]) => {
                    if (id === proposedNode.id) return;
                    history.push({ ...ev, id, eraId, expId, path: `system.eras.${eraId}.experiences.${expId}.events.${id}` });
                });
            });
        });

        // 2. Insert the proposed node into the physical stream
        history.push({ ...proposedNode, isProposed: true });

        // 3. PHYSICAL SORT: The character's life is a sequence of objective dates.
        // We use the intended physical order (Age, then Time) to establish the walk.
        history.sort((a, b) => {
            const ageA = Number(a.age) || 0;
            const ageB = Number(b.age) || 0;
            if (ageA !== ageB) return ageA - ageB;
            
            const timeA = Number(a.ts || a.time || 0);
            const timeB = Number(b.ts || b.time || 0);
            return timeA - timeB;
        });

        // 4. THE MASTER WALK (Compensation Wave)
        let currentOffset = dobTs;
        const DEFAULT_STEP = 1000;
        let runningSort = DEFAULT_STEP;

        history.forEach((node, index) => {
            const nodeTime = Number(node.ts || node.time || 0);
            
            // Derive true Subjective Age from fixed Objective Time and current rail offset
            const trueAge = Math.max(0, (nodeTime - currentOffset) / 1000);
            const trueSort = runningSort;

            // Generate database updates if the derivation differs from stored data
            if (!node.isProposed) {
                if (Math.abs(trueAge - (Number(node.age) || 0)) > 0.1) {
                    updates[`${node.path}.age`] = trueAge;
                }
                if (Number(node.sort) !== trueSort) {
                    updates[`${node.path}.sort`] = trueSort;
                }
            } else {
                // Return derived values for the proposed node to the caller
                updates.targetAge = trueAge;
                updates.targetSort = trueSort;
            }

            // Update parameters for next node
            if (node.isSpan) {
                const arrivalTs = Number(node.arrivalTs || node.arrivalTime || node.time);
                currentOffset = arrivalTs - (trueAge * 1000);
            }
            runningSort += DEFAULT_STEP;
        });

        return updates;
    }
};
