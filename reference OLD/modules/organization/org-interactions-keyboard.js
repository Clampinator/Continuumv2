import { renderOrgGraph } from './org-render.js';

export function attachOrgKeyboardAndMapListeners(svg, sheet, viewState, graphData) {
    const html = sheet.element;
    const wrapper = html.find('.span-graph-wrapper');
    const toggleBtn = html.find('.toggle-map-mode');

    const handleKeyDown = (e) => {
        if (e.key === ' ' && !e.repeat) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (wrapper.is(':hover')) {
                e.preventDefault();
                wrapper.addClass('map-mode');
                toggleBtn.addClass('active');
            }
        }
    };

    const handleKeyUp = (e) => {
        if (e.key === ' ') {
            wrapper.removeClass('map-mode');
            toggleBtn.removeClass('active');
        }
    };

    $(document).off('keydown.mapToggleOrg').off('keyup.mapToggleOrg');
    $(document).on('keydown.mapToggleOrg', handleKeyDown);
    $(document).on('keyup.mapToggleOrg', handleKeyUp);

    toggleBtn.off('click').on('click', (e) => {
        e.preventDefault();
        wrapper.toggleClass('map-mode');
        toggleBtn.toggleClass('active');
    });

    $(sheet.element).find('.reset-graph-view').on('click', () => {
        const rect = svg.getBoundingClientRect();
        viewState.x = rect.width / 2;
        viewState.y = (rect.height / 2) - (graphData.dobTimestamp * viewState.scaleY);
        viewState.scaleX = 0.000005;
        viewState.scaleY = -0.00000000288;
        renderOrgGraph(svg, viewState, graphData);
    });
}
