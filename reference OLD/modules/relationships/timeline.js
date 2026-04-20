import { setupTimeline as setup } from './timeline/setup-timeline.js';

/**
 * Character Relationship Timeline Domain
 * Orchestrator for the scrubber and date controls overlay.
 */

/**
 * Proxies call to setup-timeline atomic unit.
 */
export function setupTimeline(params) {
    return setup(params);
}