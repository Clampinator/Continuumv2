
/**
 * Snaps the slider pointer to a rank position and sets vibration intensity.
 * @param {number} rank - Selected rank (1-5).
 * @param {JQuery} html - Dialog HTML context.
 * @param {boolean} isVehicle - If true, disables vibration.
 */
export function setSlider(rank, html, isVehicle = false) {
    const pos = { 1: 10, 2: 30, 3: 50, 4: 70, 5: 90 };
    const vib = { 1: "0px", 2: "0px", 3: "1px", 4: "2px", 5: "4px" };
    const pointer = html.find('.push-slider-pointer');
    
    pointer.css({ 
        'left': `${pos[rank] || 0}%`, 
        '--vibration-intensity': isVehicle ? "0px" : (vib[rank] || "0px") 
    });
}
