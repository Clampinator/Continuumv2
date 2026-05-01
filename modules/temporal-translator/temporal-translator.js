import { parseSubjectiveAge, formatSubjectiveAge, formatSubjectiveAgeShort } from './age-converter.js';
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
        const ageShort = formatSubjectiveAgeShort(age);

        // Objective Translations
        const dt = formatObjectiveTime(ts, context);
        const arrDt = formatObjectiveTime(arrivalTs, context);

        return {
            ...rawFacts,
            ageFormatted,
            ageShort,
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
        const isSpan = Boolean(strings.eventIsSpan);
        
        // Resolve location context to ensure parsing is aware of the character's local rules
        const context = resolveLocationContext(history, age, actor);

        // 1. Resolve Departure (ts)
        // If it's a Span, we strictly look at SpanFrom fields to avoid collisions with Level fields.
        const dateStr = isSpan ? strings.eventSpanFromDate : strings.eventDate;
        const timeStr = isSpan ? strings.eventSpanFromTime : strings.eventTime;

        const ts = parseObjectiveTime(dateStr, timeStr, context);

        // 2. Resolve Arrival (arrivalTs)
        let arrivalTs = ts;
        if (isSpan) {
            arrivalTs = parseObjectiveTime(
                strings.eventSpanToDate,
                strings.eventSpanToTime,
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
