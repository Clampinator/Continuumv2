import { panToLocation, getMapCenterLocation, getActorTokenLocation, updateActorMapState } from './map-manager.js';
import { writeImmediateKeyframe } from './spacetime-bridge/write-keyframes.js';

export async function handlePersonalLocateClick(sheet, event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');
    const input = button.siblings('input[name="system.personal.birthLocation"]');

    const locationName = input.val();
    if (!locationName) {
        ui.notifications.warn("Please enter a birth location first.");
        return;
    }

    icon.removeClass('fa-map-marker-alt').addClass('fa-spinner fa-spin');
    button.prop('disabled', true);

    const result = await panToLocation(locationName);

    icon.removeClass('fa-spinner fa-spin').addClass('fa-map-marker-alt');
    button.prop('disabled', false);

    if (result) {
        updateActorMapState(sheet.actor.id, result.lat, result.lng, result.zoom || 12);
        await sheet.actor.update({
            'system.personal.birthLat': result.lat,
            'system.personal.birthLng': result.lng,
            'system.personal.birthLocation': result.formattedAddress || locationName
        });
    }
}

export async function handlePersonalGrabClick(sheet, event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');

    icon.removeClass('fa-crosshairs').addClass('fa-spinner fa-spin');
    button.prop('disabled', true);

    const result = await getMapCenterLocation();

    icon.removeClass('fa-spinner fa-spin').addClass('fa-crosshairs');
    button.prop('disabled', false);

    if (result) {
        await sheet.actor.update({
            'system.personal.birthLat': result.lat,
            'system.personal.birthLng': result.lng,
            'system.personal.birthLocation': result.formattedAddress
        });
    }
}

export async function handlePersonalTokenClick(sheet, event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');

    icon.removeClass('fa-person').addClass('fa-spinner fa-spin');
    button.prop('disabled', true);

    const result = await getActorTokenLocation(sheet.actor);

    icon.removeClass('fa-spinner fa-spin').addClass('fa-person');
    button.prop('disabled', false);

    if (!result) {
        ui.notifications.warn("No SpaceTime position available. Set the slider to a time when this character has a located lifeline event, then try again.");
        return;
    }

    // Derive a keyframe timestamp from the actor's date of birth field, falling back to slider time
    const dob = sheet.actor.system?.personal?.dob;
    const ts = dob ? new Date(`${dob}T12:00:00`).getTime() : result.timestampMs;

    await sheet.actor.update({
        'system.personal.birthLat': result.lat,
        'system.personal.birthLng': result.lng,
        'system.personal.birthLocation': result.formattedAddress
    });

    if (Number.isFinite(ts)) {
        await writeImmediateKeyframe(sheet.actor, ts, result.lat, result.lng);
    }
}
