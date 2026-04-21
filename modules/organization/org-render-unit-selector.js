export function updateUnitSelector(sheet, graphData, viewState) {
    const container = $(sheet.element).find('#org-unit-selector-container');
    if (!container.length) return;

    const trackCount = Object.keys(graphData.tracks).length;
    if (container.children().length !== trackCount) {
        container.empty();

        Object.values(graphData.tracks).forEach(track => {
            let iconClass = 'fa-question';
            switch(track.type) {
                case 'hq': iconClass = 'fa-building'; break;
                case 'physical': iconClass = 'fa-fist-raised'; break;
                case 'espionage': iconClass = 'fa-user-secret'; break;
                case 'online': iconClass = 'fa-laptop-code'; break;
                case 'psyops': iconClass = 'fa-bullhorn'; break;
            }

            const chip = $(`<div class="goal-hud-chip unit-selector-chip ${track.type}" data-unit-id="${track.id}" data-type="${track.type}">
                <i class="fas ${iconClass}" style="margin-right:5px;"></i>
                <span class="goal-hud-text">${track.name}</span>
            </div>`);

            container.append(chip);
        });
    }

    container.find('.unit-selector-chip').removeClass('active');
    if (viewState.activeUnitId) {
        container.find(`.unit-selector-chip[data-unit-id="${viewState.activeUnitId}"]`).addClass('active');
    }
}
