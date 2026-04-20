import { generateEras as genEras } from './segment-generator/generate-ages.js';
import { generateExperiences as genExps } from './segment-generator/generate-experiences.js';

/*
Orchestrator: Structural Segment Generation.
Decimated into atomic units for physical isolation of logic.
*/
export const SegmentGenerator = {
    // Proxies call to atomic generate-eras unit.
    generateEras(sortedEras) {
        return genEras(sortedEras);
    },

    // Proxies call to atomic generate-experiences unit.
    generateExperiences(sortedEras, levelNodes, nowNode) {
        return genExps(sortedEras, levelNodes, nowNode);
    }
};