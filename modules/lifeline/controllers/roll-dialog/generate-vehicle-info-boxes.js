/**
 * Dynamically populates the info containers with vehicle stats.
 * @param {object} vehicle - The vehicle data object.
 * @param {JQuery} html - Dialog HTML context.
 */
export function generateVehicleInfoBoxes(vehicle, html) {
    const leftContainer = html.find('.metability-info-left');
    const rightContainer = html.find('.metability-info-right');

    leftContainer.empty().hide();
    rightContainer.empty().hide();

    if (!vehicle) return;

    leftContainer.show().css('display', 'flex');
    
    const stats = {
        "Passengers": vehicle.passengers || 0,
        "Mass (t)": vehicle.mass || 0,
        "IP": vehicle.ip || 0,
        "Armor": vehicle.armor || 0
    };

    Object.entries(stats).forEach(([label, value]) => {
        const boxHtml = `<div class="info-box"><h4>${label}</h4><p>${value}</p></div>`;
        leftContainer.append(boxHtml);
    });
}
