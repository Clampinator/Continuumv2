import { parseSubjectiveAge, formatSubjectiveAge } from './age-converter.js';
import { parseObjectiveTime, formatObjectiveTime } from './coordinate-converter.js';
import { resolveLocationContext } from './location-resolver.js';

/**
 * TEMPORAL TRANSLATOR: FACADE
 * Entry point for the TTL. Orchestrates all translations between
 * human-readable UI strings and mathematical coordinates.
 */
export const Translator = {
    /**
     * Translates a bag of pure mathematical integers into localized UI strings.
     * @param {Object} rawFacts - { eventAge, ts, arrivalTs, ... }
     * @param {Array} history - character history records
     * @param {Object} actor - character actor
     * @returns {Object} Bundle of localized strings
     */
    toHuman(rawFacts, history, actor) {
        const age = Number(rawFacts.eventAge) || 0;
        const ts = Number(rawFacts.ts) || 0;
        const arrivalTs = Number(rawFacts.arrivalTs) || ts;
        
        // Resolve location context for the specific point in history
        const context = resolveLocationContext(history, age, actor);

        // Subjective Translations
        const ageFormatted = formatSubjectiveAge(age);

        // Objective Translations
        const dt = formatObjectiveTime(ts, context);
        const arrDt = formatObjectiveTime(arrivalTs, context);

        return {
            ...rawFacts,
            ageFormatted,
            date: dt.date,
            time: dt.time,
            eventSpanFromDate: dt.date,
            eventSpanFromTime: dt.time,
            eventSpanToDate: arrDt.date,
            eventSpanToTime: arrDt.time,
            locationContext: context
        };
    },

    /**
     * Translates a bag of user-provided strings into pure mathematical integers.
     * @param {Object} strings - { eventAge, eventDate, eventTime, ... }
     * @param {Array} history - character history records
     * @param {Object} actor - character actor
     * @returns {Object} Bundle of pure integers
     */
    toAtomic(strings, history, actor) {
        const age = parseSubjectiveAge(strings.eventAge);
        
        // Resolve location context to ensure parsing is aware of the character's local rules
        const context = resolveLocationContext(history, age, actor);

        const ts = parseObjectiveTime(
            strings.eventDate || strings.eventSpanFromDate, 
            strings.eventTime || strings.eventSpanFromTime, 
            context
        );

        let arrivalTs = ts;
        if (strings.eventIsSpan) {
            arrivalTs = parseObjectiveTime(
                strings.eventSpanToDate || strings.eventDate,
                strings.eventSpanToTime || strings.eventTime,
                context
            );
        }

        return {
            ...strings,
            eventAge: age,
            ts,
            arrivalTs
        };
    }
};
