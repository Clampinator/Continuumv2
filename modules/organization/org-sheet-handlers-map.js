import { panToLocation, getMapCenterLocation, getActorTokenLocation, updateActorMapState } from '../map-manager.js';

/**
 * Locate button handler for org sheets.
 * Reads system.structure.headquarters, geocodes it, and pans the org's map.
 */
export async function handleOrgLocateClick(sheet, event) {
    event.preventDefault();
    if (!window.google?.maps) {
        ui.notifications.warn("Map API not loaded yet. Please wait a moment.");
        return;
    }

    const mapActorKey = 'org-ops-' + sheet.actor.id;
    const button = $(event.currentTarget);
    const icon = button.find('i');
    const input = button.siblings('input[name="system.structure.headquarters"]');

    const locationName = input.val();
    if (!locationName) {
        ui.notifications.warn("Please enter a headquarters location first.");
        return;
    }

    icon.removeClass('fa-map-marker-alt').addClass('fa-spinner fa-spin');
    button.prop('disabled', true);

    const result = await panToLocation(locationName, mapActorKey);

    icon.removeClass('fa-spinner fa-spin').addClass('fa-map-marker-alt');
    button.prop('disabled', false);

    if (result) {
        updateActorMapState(mapActorKey, result.lat, result.lng, result.zoom || 12);
        await sheet.actor.update({
            'system.structure.headquartersLat': result.lat,
            'system.structure.headquartersLng': result.lng,
            'system.structure.headquarters': result.formattedAddress || locationName
        });
    }
}

/**
 * Grab map center handler for org sheets.
 * Reads the org's map center and saves it as the HQ coordinates.
 */
export async function handleOrgGrabClick(sheet, event) {
    event.preventDefault();
    if (!window.google?.maps) {
        ui.notifications.warn("Map API not loaded yet. Please wait a moment.");
        return;
    }

    const mapActorKey = 'org-ops-' + sheet.actor.id;
    const button = $(event.currentTarget);
    const icon = button.find('i');

    icon.removeClass('fa-crosshairs').addClass('fa-spinner fa-spin');
    button.prop('disabled', true);

    const result = await getMapCenterLocation(mapActorKey);

    icon.removeClass('fa-spinner fa-spin').addClass('fa-crosshairs');
    button.prop('disabled', false);

    if (result) {
        await sheet.actor.update({
            'system.structure.headquartersLat': result.lat,
            'system.structure.headquartersLng': result.lng,
            'system.structure.headquarters': result.formattedAddress
        });
    }
}

export async function handleOrgTokenClick(sheet, event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');

    icon.removeClass('fa-person').addClass('fa-spinner fa-spin');
    button.prop('disabled', true);

    const result = await getActorTokenLocation(sheet.actor);

    icon.removeClass('fa-spinner fa-spin').addClass('fa-person');
    button.prop('disabled', false);

    if (!result) {
        ui.notifications.warn("No SpaceTime position available. Set the slider to a time when this actor has a located lifeline event, then try again.");
        return;
    }

    await sheet.actor.update({
        'system.personal.birthLat': result.lat,
        'system.personal.birthLng': result.lng,
        'system.personal.birthLocation': result.formattedAddress
    });
}
