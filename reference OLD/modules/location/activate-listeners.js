
/**
 * Activates listeners for the Location sheet.
 */
export function activateLocationListeners(sheet, html) {
    // Handle Item Add (Aspects)
    html.find('.item-add').click(async ev => {
        const type = ev.currentTarget.dataset.type;
        if (type === 'aspect') {
            // We'll just add a blank entry to the aspects object
            // This is a simplified version; in a real system we might use actual Items
            // but for now we're following the template.json structure.
            const id = foundry.utils.randomID();
            // We need to know which category to add to. 
            // Since the button is in the header, we might need to prompt or default.
            // Let's assume the button can specify a category or we default to infrastructure.
            const category = ev.currentTarget.dataset.category || "infrastructure";
            const updatePath = `system.aspects.${category}.${id}`;
            await sheet.actor.update({
                [updatePath]: { name: "New Aspect", rating: 0 }
            });
        }
    });

    // Handle Item Delete (Aspects)
    html.find('.item-delete').click(async ev => {
        const id = ev.currentTarget.dataset.id;
        const category = ev.currentTarget.dataset.category;
        const updatePath = `system.aspects.${category}.-=${id}`;
        await sheet.actor.update({ [updatePath]: null });
    });

    // Handle Attribute Rolls
    html.find('.roll-attribute').click(ev => {
        const attribute = ev.currentTarget.dataset.attribute;
        const value = sheet.actor.system.attributes[attribute].value;
        
        // Trigger a basic roll dialog (placeholder for now)
        ui.notifications.info(`Rolling ${attribute.toUpperCase()}: ${value}`);
        // In the real system, this would call the roll engine.
    });

    // Handle Map Reset
    html.find('.reset-map-view').click(ev => {
        ui.notifications.info("Map view reset to default coordinates.");
        // Map logic will go here
    });

    // Geocode button: fill lat/lng from location name using Maps JS SDK
    html.find('.geocode-location-btn').click(async ev => {
        const name = sheet.actor.system.details.name || sheet.actor.name;
        const locality = sheet.actor.system.details.locality || '';
        const query = [name, locality].filter(Boolean).join(', ');

        if (!window.google?.maps?.Geocoder) {
            return ui.notifications.warn("Google Maps is not loaded yet — open an Org Map first, then try again.");
        }

        const btn = $(ev.currentTarget);
        btn.find('i').attr('class', 'fas fa-spinner fa-spin');

        const result = await new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: query }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    resolve({ lat: loc.lat(), lng: loc.lng() });
                } else {
                    resolve(null);
                }
            });
        });

        btn.find('i').attr('class', 'fas fa-map-marker-alt');

        if (!result) {
            return ui.notifications.warn(`Could not geocode "${query}". Check the location name and try again.`);
        }

        await sheet.actor.update({ 'system.map.lat': result.lat, 'system.map.lng': result.lng });
        ui.notifications.info(`Coordinates set: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
    });

    // GM toggle: reveal/hide this location on player org maps
    html.find('.reveal-on-org-map').on('change', async function () {
        const revealed = this.checked;
        await sheet.actor.setFlag('continuum', 'revealedOnOrgMap', revealed);
        const icon = $(this).siblings('i');
        icon.toggleClass('fa-eye', revealed).toggleClass('fa-eye-slash', !revealed);
        $(this).closest('.location-reveal-toggle').attr('title',
            revealed ? 'Hide from player Org Maps' : 'Reveal on player Org Maps'
        );
        ui.notifications.info(`${sheet.actor.name} is now ${revealed ? 'visible on' : 'hidden from'} Org Maps.`);
    });
}
