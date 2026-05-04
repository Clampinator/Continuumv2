import { parseSubjectiveAge, formatSubjectiveAge, formatSubjectiveAgeShort, formatDuration } from './age-converter.js';
import { parseObjectiveTime, formatObjectiveTime, timestampToDateString, formatDateOnly, formatTimeOnly, normalizeDateInput, parseDateToObjectiveMs } from './coordinate-converter.js';
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
     * Formats a duration in seconds. Same format as formatSubjectiveAge
     * but semantically distinct (elapsed time vs lifeline position).
     * @param {number} seconds - Duration in seconds.
     * @returns {string} Formatted duration string.
     */
    formatDuration(seconds) {
        return formatDuration(seconds);
    },

    /**
     * Converts a timestamp (ms) to a { date, time } object.
     * Defaults to UTC when no context is provided.
     * @param {number} ts - Integer milliseconds.
     * @param {Object} [context] - { timezone: string }
     * @returns {Object} { date: string, time: string }
     */
    timestampToDateString(ts, context) {
        return timestampToDateString(ts, context);
    },

    /**
     * Formats a timestamp to a date-only string "YYYY-MM-DD".
     * @param {number} ts - Integer milliseconds.
     * @param {Object} [context] - { timezone: string }
     * @returns {string} Date string.
     */
    formatDateOnly(ts, context) {
        return formatDateOnly(ts, context);
    },

    /**
     * Formats a timestamp to a time-only string "HH:MM:SS".
     * @param {number} ts - Integer milliseconds.
     * @param {Object} [context] - { timezone: string }
     * @returns {string} Time string.
     */
    formatTimeOnly(ts, context) {
        return formatTimeOnly(ts, context);
    },

    /**
     * Normalizes a date input to "YYYY-MM-DD" using UTC interpretation.
     * @param {string|number} val - Raw date input.
     * @returns {string} "YYYY-MM-DD" or "" for falsy input.
     */
    normalizeDateInput(val) {
        return normalizeDateInput(val);
    },

    /**
     * Parses a date+time to epoch milliseconds, enforcing UTC.
     * @param {string} dateString - "YYYY-MM-DD"
     * @param {string} [timeString] - "HH:MM:SS" (defaults to 12:00:00)
     * @returns {number} Epoch ms, or 0 for invalid input.
     */
    parseDateToObjectiveMs(dateString, timeString) {
        return parseDateToObjectiveMs(dateString, timeString);
    },

    /**
     * Translates a bag of user-provided strings into pure mathematical integers.
     * @param {Object} strings - { eventAge, eventDate, eventTime, ... }
     * @param {Array} history - character history records
     * @param {Object} actor - character actor
     * @returns {Object} Bundle of pure integers
     */
    toAtomic(strings, history, actor) {
        // Strip internal routing keys that must not reach the database.
        const { _spanRecordId, ...persistable } = strings;

        const age = parseSubjectiveAge(persistable.eventAge);
        const isSpan = Boolean(persistable.eventIsSpan);

        // Resolve location context to ensure parsing is aware of the character's local rules
        const context = resolveLocationContext(history, age, actor);

        // 1. Resolve Departure (ts)
        // If it's a Span, we strictly look at SpanFrom fields to avoid collisions with Level fields.
        const dateStr = isSpan ? persistable.eventSpanFromDate : persistable.eventDate;
        const timeStr = isSpan ? persistable.eventSpanFromTime : persistable.eventTime;

        const ts = parseObjectiveTime(dateStr, timeStr, context);

        // 2. Resolve Arrival (arrivalTs)
        let arrivalTs = ts;
        if (isSpan) {
            arrivalTs = parseObjectiveTime(
                persistable.eventSpanToDate,
                persistable.eventSpanToTime,
                context
            );
        }

        return {
            ...persistable,
            eventAge: age,
            ts,
            arrivalTs
        };
    }
};
