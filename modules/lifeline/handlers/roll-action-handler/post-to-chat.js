
/**
 * Renders the chat template and creates a ChatMessage in Foundry.
 * Adds resolution metadata to enable "Apply Results" button functionality.
 * @param {Actor} actor 
 * @param {string} flavor 
 * @param {object} data - Template variables.
 * @returns {Promise<ChatMessage>}
 */
export async function postToChat(actor, flavor, data) {
    const html = await foundry.applications.handlebars.renderTemplate("systems/continuum-v2/templates/chat-roll.html", data);

    const messageData = {
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: flavor,
        content: html,
        rolls: [data.roll],
        sound: CONFIG.sounds.dice,
        ...(data.whisperGM ? { whisper: ChatMessage.getWhisperRecipients('GM').concat(game.user.isGM ? [] : [game.user]) } : {}),
        flags: {
            continuum: {
                combatResolution: {
                    targetUuid: data.defenderUuid,
                    passedDamage: data.mitigation?.passedDamage || 0,
                    damageType: data.mitigation?.damageType || "Lethal",
                    isDegraded: !!data.mitigation?.isDegraded,
                    hitLocation: data.hitLocation
                }
            }
        }
    };

    return ChatMessage.create(messageData);
}
