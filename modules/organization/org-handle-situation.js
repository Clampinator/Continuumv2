
import { evaluateDiceRoll } from '../lifeline/handlers/roll-action-handler/evaluate-dice-roll.js';
import { calculateStandardResult } from '../lifeline/handlers/roll-action-handler/calculate-standard-result.js';
import { CONFLICT_TYPE_MAP } from './org-map.js';

const ORG_ATTR_LABEL = { force: 'Force', intel: 'Intel', comms: 'Comms', influence: 'Influence' };
const LOC_ATTR_LABEL = { scale: 'Scale', cohesion: 'Cohesion', civics: 'Civics', output: 'Output' };

/**
 * Collects all non-resolved engagements for a given unit that have a targetLocationId.
 */
function getActiveEngagementsForUnit(actor, unitId) {
    const results = [];
    for (const [phaseId, phase] of Object.entries(actor.system.phases || {})) {
        if (!phase) continue;
        for (const [opId, op] of Object.entries(phase.operations || {})) {
            if (!op) continue;
            for (const [engId, eng] of Object.entries(op.engagements || {})) {
                if (eng?.unitId === unitId && eng.targetLocationId && !eng.resolved) {
                    results.push({ ...eng, id: engId, phaseId, opId });
                }
            }
        }
    }
    return results;
}

/**
 * Finds the most recent deployment record for a unit (any engagement with coordinates).
 * Returns { lat, lng, phaseId, opId, engId } or null.
 */
function getUnitDeployment(actor, unitId) {
    const deployments = [];
    for (const [phaseId, phase] of Object.entries(actor.system.phases || {})) {
        if (!phase) continue;
        for (const [opId, op] of Object.entries(phase.operations || {})) {
            if (!op) continue;
            for (const [engId, eng] of Object.entries(op.engagements || {})) {
                if (eng?.unitId !== unitId || eng.resolved) continue;
                const lat = parseFloat(eng.spanFromLat);
                const lng = parseFloat(eng.spanFromLng);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
                const t = new Date((eng.date || '1970-01-01') + 'T' + (eng.time || '00:00')).getTime();
                deployments.push({ lat, lng, t, phaseId, opId, engId });
            }
        }
    }
    if (!deployments.length) return null;
    deployments.sort((a, b) => b.t - a.t);
    return deployments[0];
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns all revealed location actors within range of a point.
 * Range scales with the location's Scale attribute: radius = 25 * scale km (min 25, max 250).
 */
function getLocationsInRange(lat, lng) {
    return (game.actors?.contents ?? []).filter(a => {
        if (a.type !== 'location') return false;
        if (!a.getFlag('continuum-v2', 'revealedOnOrgMap')) return false;
        const locLat = parseFloat(a.system?.map?.lat);
        const locLng = parseFloat(a.system?.map?.lng);
        if (!Number.isFinite(locLat) || !Number.isFinite(locLng)) return false;
        const scale   = Math.max(1, Math.min(10, a.system?.attributes?.scale?.value || 5));
        const radiusKm = scale * 25; // scale 1 = 25 km, scale 10 = 250 km
        return haversineKm(lat, lng, locLat, locLng) <= radiusKm;
    });
}

/**
 * Dialog to pick one engagement when a unit has multiple active ones.
 */
function pickEngagement(engagements) {
    return new Promise((resolve) => {
        const options = engagements.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        new Dialog({
            title: "Choose Engagement",
            content: `<form><div class="form-group"><label>Active Engagements</label><select name="engId">${options}</select></div></form>`,
            buttons: {
                ok: {
                    label: "Attack",
                    callback: (html) => {
                        const id = html.find('[name="engId"]').val();
                        resolve(engagements.find(e => e.id === id) ?? null);
                    }
                },
                cancel: { label: "Cancel", callback: () => resolve(null) }
            },
            default: "ok"
        }, { classes: ["continuum-v2", "dialog"] }).render(true);
    });
}

/**
 * Dialog to pick a target location from geographically nearby options.
 * Returns the chosen location actor, or null.
 */
function pickNearbyLocation(locations, unitName) {
    return new Promise((resolve) => {
        const options = locations.map(l => {
            const lat = parseFloat(l.system?.map?.lat).toFixed(2);
            const lng = parseFloat(l.system?.map?.lng).toFixed(2);
            return `<option value="${l.id}">${l.name} (${lat}, ${lng})</option>`;
        }).join('');
        new Dialog({
            title: "Select Target",
            content: `<form>
                <p><strong>${unitName}</strong> is within operational range of the following locations. Select a target:</p>
                <div class="form-group">
                    <select name="locId">${options}</select>
                </div>
            </form>`,
            buttons: {
                ok: {
                    label: "Confirm Target",
                    callback: (html) => {
                        const id = html.find('[name="locId"]').val();
                        resolve(locations.find(l => l.id === id) ?? null);
                    }
                },
                cancel: { label: "Cancel", callback: () => resolve(null) }
            },
            default: "ok"
        }, { classes: ["continuum-v2", "dialog"] }).render(true);
    });
}

/**
 * Called when a unit's attack button (Attack / Infiltrate / Hack / Influence) is clicked.
 * Resolves the conflict roll against the target location and auto-applies the result.
 */
export async function handleOrgSituationClick(sheet, event) {
    event.preventDefault();
    const button    = event.currentTarget;
    const attribute = button.dataset.attribute;  // force / intel / comms / influence
    const unitId    = button.dataset.unitId;
    const unitType  = button.dataset.unitType;

    const unitData = sheet.actor.system.conflict[unitType]?.[unitId] ?? {};
    const unitName = unitData.description || unitType;

    const conflictInfo = CONFLICT_TYPE_MAP[unitType] ?? CONFLICT_TYPE_MAP.physical;
    const locAttrKey   = conflictInfo.locAttr;

    // 1. Look for engagements already linked to a location
    const linkedEngagements = getActiveEngagementsForUnit(sheet.actor, unitId);

    let location = null;
    let engagement = null;

    if (linkedEngagements.length > 0) {
        // Already has a target — pick if multiple
        engagement = linkedEngagements.length === 1
            ? linkedEngagements[0]
            : await pickEngagement(linkedEngagements);
        if (!engagement) return;
        location = game.actors.get(engagement.targetLocationId);
        if (!location) {
            return ui.notifications.warn("Target location actor not found — it may have been deleted.");
        }

    } else {
        // 2. No linked engagement — find where the unit is deployed and check proximity
        const deployment = getUnitDeployment(sheet.actor, unitId);
        if (!deployment) {
            return ui.notifications.warn(
                `${unitName} has no deployment. Drag it onto the Operational Map first.`
            );
        }

        const nearby = getLocationsInRange(deployment.lat, deployment.lng);
        if (nearby.length === 0) {
            return ui.notifications.warn(
                `${unitName} is not within operational range of any revealed location. ` +
                `Move the unit closer to a target on the Operational Map.`
            );
        }

        location = nearby.length === 1 ? nearby[0] : await pickNearbyLocation(nearby, unitName);
        if (!location) return;

        // Save targetLocationId onto the deployment engagement so future attacks resolve immediately
        await sheet.actor.update({
            [`system.phases.${deployment.phaseId}.operations.${deployment.opId}.engagements.${deployment.engId}.targetLocationId`]: location.id
        });
    }

    // 3. TN = the location's relevant defense attribute
    const tn = Number(location.system.attributes[locAttrKey]?.value) || 0;

    // 4. Roll: TN - floor(2d10 / 2) — positive delta = success
    const { roll, delta } = await evaluateDiceRoll(tn, 'normal');
    const result          = calculateStandardResult(delta);

    // 5. On success, reduce the location's defense attribute by the degree of success
    const prevVal = tn;
    let   newVal  = tn;
    if (delta >= 0) {
        newVal = Math.max(0, prevVal - delta);
        await location.update({ [`system.attributes.${locAttrKey}.value`]: newVal });
    }

    // 6. Post result to chat
    const d10Part     = roll.dice.find(d => d.faces === 10);
    const diceResults = d10Part?.results.map(r => ({ value: r.result, discarded: r.active === false })) ?? [];

    const content = await foundry.applications.handlebars.renderTemplate("systems/continuum-v2/templates/chat-org-attack.html", {
        unitName,
        locationName:  location.name,
        orgAttr:       ORG_ATTR_LABEL[attribute]  ?? attribute,
        locAttr:       LOC_ATTR_LABEL[locAttrKey] ?? locAttrKey,
        locAttrColor:  conflictInfo.color,
        tn,
        diceResults,
        delta,
        resultText:    result.text,
        resultClass:   result.cssClass,
        isSuccess:     delta >= 0,
        damageApplied: delta >= 0 ? delta : 0,
        prevVal,
        newVal
    });

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: sheet.actor }),
        flavor:  `${sheet.actor.name} — ${unitName} attacks ${location.name}`,
        content,
        rolls:   [roll],
        sound:   CONFIG.sounds.dice
    });
}
