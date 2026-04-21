import { ReferenceResolver } from './reference-resolver.js';
import { parseDate } from '../../span-graph-utils/provide-span-graph-utils.js';

/*
Read-only diagnostic. Scans all character actors for lifeline data quality
issues and reports findings to the console. No writes are performed.

Called once from sheet-hooks.js on the 'ready' hook, GM only.
*/

function _checkEvent(event, eventId, eraId, expId, actorName, dobTs, issues) {
    const age = Number(event.age);
    const hasAge = Number.isFinite(age) && age > 0;
    const dateStr = event.isSpan ? event.spanFromDate : event.date;
    const hasDate = !!(dateStr && String(dateStr).trim());

    // Completely unanchored: no date and no subjective age
    if (!hasAge && !hasDate) {
        issues.push({
            actor: actorName,
            event: event.title || '(untitled)',
            eventId,
            problem: 'No date and no age - event is unanchored'
        });
        return;
    }

    // Post-birth date with age still at zero - age was never computed
    if (!hasAge && hasDate && dobTs) {
        const dt = parseDate(`${dateStr}T${event.time || '12:00:00'}`);
        if (dt) {
            const msSinceBirth = dt.getTime() - dobTs;
            // More than 1 day after birth - should have a non-zero age
            if (msSinceBirth > 86400000) {
                issues.push({
                    actor: actorName,
                    event: event.title || '(untitled)',
                    eventId,
                    problem: `Date ${dateStr} is post-birth but age = 0 (was never computed)`
                });
            }
        }
    }
}

export function runLifelineAudit() {
    if (!game.user?.isGM) return;

    const actors = (game.actors?.contents ?? []).filter(a => a.type === 'character');
    if (!actors.length) return;

    const issues = [];
    let totalEvents = 0;

    for (const actor of actors) {
        const dobTs = ReferenceResolver.resolveOrigin(actor);

        for (const [eraId, era] of Object.entries(actor.system.eras || {})) {
            for (const [eventId, event] of Object.entries(era.events || {})) {
                totalEvents++;
                _checkEvent(event, eventId, eraId, null, actor.name, dobTs, issues);
            }
            for (const [expId, exp] of Object.entries(era.experiences || {})) {
                for (const [eventId, event] of Object.entries(exp.events || {})) {
                    totalEvents++;
                    _checkEvent(event, eventId, eraId, expId, actor.name, dobTs, issues);
                }
            }
        }
    }

    if (!issues.length) {
        console.log(
            `Continuum | Lifeline Audit | ${totalEvents} event(s) across ` +
            `${actors.length} actor(s) - no issues found.`
        );
        return;
    }

    console.warn(
        `Continuum | Lifeline Audit | ${issues.length} issue(s) found across ` +
        `${totalEvents} event(s) in ${actors.length} actor(s):`
    );
    console.table(issues);

    ui.notifications?.warn(
        `Lifeline Audit: ${issues.length} event(s) need attention. Check the browser console for details.`
    );
}
