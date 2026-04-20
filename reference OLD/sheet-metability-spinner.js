// sheet-metability-spinner.js
// This module contains the logic for the interactive metability rank spinner UI component.

/**
 * Initializes the metability rank spinners on the character sheet.
 * @param {JQuery} html The jQuery object representing the sheet's HTML.
 * @param {ActorSheet} sheet The instance of the actor sheet.
 */
export function initializeMetabilitySpinners(html, sheet) {
  const spinnerViewports = html.find('.metability-spinner-viewport');
  const snapOffsets = [-4, -80, -160, -240, -315, -394];
  const numImages = snapOffsets.length;
  const maxTop = snapOffsets[numImages - 1];

  // Initialize spinner positions based on actor data
  spinnerViewports.each(function() {
    const viewport = $(this);
    const metabilityName = viewport.data('metability');
    const value = Number(viewport.siblings(`input[name="system.metabilities.${metabilityName}.value"]`).val()) || 0;
    const initialTop = snapOffsets[value] || 0;
    viewport.find('.metability-spinner-image').css('top', `${initialTop}px`);
  });

  // Add event listener for dragging
  spinnerViewports.on('pointerdown', (event) => {
    if (event.button !== 0) return; // Only handle left-click
    const viewport = $(event.currentTarget);
    const image = viewport.find('.metability-spinner-image');
    event.preventDefault();

    const startY = event.pageY;
    const startTop = parseInt(image.css('top'), 10);
    image.css('transition', 'none'); // Disable transition during drag
    viewport.addClass('active');

    const onPointerMove = (moveEvent) => {
      const deltaY = moveEvent.pageY - startY;
      let newTop = startTop + deltaY;
      // Clamp the position within the bounds of the image strip
      newTop = Math.max(maxTop, Math.min(0, newTop));
      image.css('top', `${newTop}px`);
    };

    const onPointerUp = () => {
      image.css('transition', 'top 0.15s ease-out'); // Re-enable transition for snapping
      viewport.removeClass('active');
      $(document).off('pointermove', onPointerMove).off('pointerup', onPointerUp);

      const finalTop = parseInt(image.css('top'), 10);
      let closestSnapIndex = 0;
      let minDistance = Infinity;

      // Find the closest snap point to the final drag position
      snapOffsets.forEach((offset, index) => {
        const distance = Math.abs(finalTop - offset);
        if (distance < minDistance) {
          minDistance = distance;
          closestSnapIndex = index;
        }
      });
      
      const clampedValue = closestSnapIndex;
      const snapTop = snapOffsets[clampedValue];
      image.css('top', `${snapTop}px`);

      const metabilityName = viewport.data('metability');
      const hiddenInput = viewport.siblings(`input[name="system.metabilities.${metabilityName}.value"]`);
      const oldValue = Number(hiddenInput.val());
      
      // Enable/disable the roll button based on the new rank
      const rollButton = viewport.closest('.metability-block').find(`.roll-attribute[data-attribute="meta-${metabilityName}"]`);
      rollButton.prop('disabled', clampedValue === 0);

      // Update the actor's data if the value has changed
      if (clampedValue !== oldValue) {
        hiddenInput.val(clampedValue);
        const updatePath = `system.metabilities.${metabilityName}.value`;
        sheet.actor.update({ [updatePath]: clampedValue }, { render: false });
      }
    };

    // Attach listeners to the document to handle dragging outside the viewport
    $(document).on('pointermove', onPointerMove).on('pointerup', onPointerUp);
  });
}