/**
 * Checks for a Grace Point award when a standard roll exactly matches the target.
 * Triggered only on normal (2d10) rolls where delta === 0.
 * Rolls a hidden 1d10; if it also matches finalTarget, awards one Grace Point.
 * @param {Actor} actor
 * @param {number} delta
 * @param {number} finalTarget
 * @param {string} rollType
 */
export async function checkGrace(actor, delta, finalTarget, rollType) {
    if (rollType !== 'normal') return;
    if (delta !== 0) return;

    const graceRoll = new Roll('1d10');
    await graceRoll.evaluate();
    const graceRollResult = graceRoll.total;
    const graceRollRendered = await graceRoll.render();

    if (graceRollResult === finalTarget) {
        const currentGrace = Number(actor.system.personal?.grace) || 0;
        await actor.update({ 'system.personal.grace': String(currentGrace + 1) });

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `
                <div style="text-align:center; border-top:1px solid #BBB; margin-top:10px; padding-top:5px;">
                    <h4 style="margin:0 0 5px 0;">Grace Check: Success!</h4>
                    <p style="margin:2px 0;">The roll result of 0 triggered a Grace Check.</p>
                    <p style="margin:2px 0;">The 1d10 needed to match the target of ${finalTarget}.</p>
                    ${graceRollRendered}
                    <h3 style="color:#FFD700; text-align:center; margin-top:5px; text-shadow:0 0 5px #000;">GRACE POINT AWARDED!</h3>
                </div>
            `
        });
    } else {
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `
                <div style="text-align:center; border-top:1px solid #BBB; margin-top:10px; padding-top:5px;">
                    <h4 style="margin:0 0 5px 0;">Grace Check: Fail</h4>
                    <p style="margin:2px 0;">The roll result of 0 triggered a Grace Check.</p>
                    <p style="margin:2px 0;">The 1d10 needed to match the target of ${finalTarget}. Rolled: ${graceRollResult}.</p>
                    ${graceRollRendered}
                </div>
            `
        });
    }
}
