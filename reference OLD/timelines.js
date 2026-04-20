// timelines.js
// This module contains logic for the "Timelines" section of the character sheet.

let globalPopoverListenerAttached = false;

/**
 * Attaches a single, permanent, global event listener to the document to handle closing popovers.
 * This runs only once to prevent conflicts between multiple open sheets.
 */
function setupGlobalPopoverCloser() {
    if (globalPopoverListenerAttached) return;

    // A single, smart global listener.
    $(document).on('click.continuumTimeline', function(event) {
        // If the click is NOT on a timeline pill and NOT inside a popover, hide all popovers.
        if (!$(event.target).closest('.timeline-item-group, .timeline-popover').length) {
            $('.timeline-popover').hide();
        }
    });

    globalPopoverListenerAttached = true;
    console.log("Continuum | Global timeline popover listener attached.");
}


/**
 * Checks if a value can be parsed into a valid Date.
 * @param {*} d The value to check.
 * @returns {boolean} True if it's a valid date.
 */
function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

/**
 * Draws the horizontal X-axis (time ruler) for the timeline.
 * @param {SVGSVGElement} svg The main SVG element.
 * @param {object} transform The current transform { k: scale, x: pan }.
 * @param {function} timeScale The function to convert a date to an X coordinate.
 * @param {Date} minDate The earliest date in the entire dataset.
 * @param {Date} maxDate The latest date in the entire dataset.
 * @param {number} width The width of the SVG viewport.
 * @param {number} height The total height of the SVG.
 */
function drawXAxis(svg, transform, timeScale, minDate, maxDate, width, height) {
    const axisGroup = svg.querySelector('.timeline-axis-x');
    const gridGroup = svg.querySelector('.timeline-grid-lines');
    if (!axisGroup || !gridGroup) return;

    axisGroup.innerHTML = ''; // Clear previous axis
    gridGroup.innerHTML = ''; // Clear previous grid
    const svgNS = "http://www.w3.org/2000/svg";

    const visibleStart = (0 - transform.x) / transform.k;
    const visibleEnd = (width - transform.x) / transform.k;
    const visibleScale = (date) => timeScale(date) * transform.k + transform.x;

    const visibleStartDate = timeScale.invert(visibleStart);
    const visibleEndDate = timeScale.invert(visibleEnd);
    if (!isValidDate(visibleStartDate) || !isValidDate(visibleEndDate)) return;
    
    const visibleDuration = visibleEndDate.getTime() - visibleStartDate.getTime();
    if (visibleDuration <= 0) return;

    const MS_IN_DAY = 86400000;
    const MS_IN_YEAR = MS_IN_DAY * 365.25;

    let ticks = [];
    let tickFormat;
    const targetTickCount = width / 120; // Aim for a tick every 120 pixels

    // Determine the appropriate time unit for ticks based on the visible duration
    if (visibleDuration > targetTickCount * MS_IN_YEAR * 0.8) { // Years
        tickFormat = (d) => d.getFullYear();
        let current = new Date(visibleStartDate.getFullYear(), 0, 1);
        if (current < visibleStartDate) current.setFullYear(current.getFullYear() + 1);
        while (current <= visibleEndDate) {
            ticks.push(new Date(current));
            current.setFullYear(current.getFullYear() + 1);
        }
    } else if (visibleDuration > targetTickCount * MS_IN_DAY * 25) { // Months
        tickFormat = (d) => d.toLocaleString('default', { month: 'short', year: 'numeric' });
        let current = new Date(visibleStartDate.getFullYear(), visibleStartDate.getMonth(), 1);
        if (current < visibleStartDate) current.setMonth(current.getMonth() + 1);
        while (current <= visibleEndDate) {
            ticks.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }
    } else { // Days
        tickFormat = (d) => d.toLocaleString('default', { month: 'short', day: 'numeric' });
        let current = new Date(visibleStartDate.getFullYear(), visibleStartDate.getMonth(), visibleStartDate.getDate());
        while (current <= visibleEndDate) {
            ticks.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
    }
    
    // Filter ticks for density
    while (ticks.length > targetTickCount * 2 && ticks.length > 2) {
        ticks = ticks.filter((_, i) => i % 2 === 0);
    }

    ticks.forEach(date => {
        const x = visibleScale(date);
        if (x >= 0 && x <= width) {
            const tick = document.createElementNS(svgNS, 'line');
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', 20);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', 40);
            tick.classList.add('timeline-tick');

            const label = document.createElementNS(svgNS, 'text');
            label.setAttribute('x', x);
            label.setAttribute('y', 15);
            label.classList.add('timeline-axis-label');
            label.textContent = tickFormat(date);
            
            const gridLine = document.createElementNS(svgNS, 'line');
            gridLine.setAttribute('x1', x);
            gridLine.setAttribute('y1', 40);
            gridLine.setAttribute('x2', x);
            gridLine.setAttribute('y2', height);
            gridLine.classList.add('timeline-grid-line');

            axisGroup.appendChild(tick);
            axisGroup.appendChild(label);
            gridGroup.appendChild(gridLine);
        }
    });
}


/**
 * Packs items with durations (Ages, Experiences) into rows to avoid horizontal overlaps.
 * @param {Array} items - A list of items, sorted by startDate. Each item must have startDate and endDate properties.
 * @returns {Array<Array>} An array of rows, where each row is an array of non-overlapping items.
 */
function packItemsIntoRows(items) {
    const rows = [];
    if (!items || items.length === 0) return rows;

    for (const item of items) {
        let placed = false;
        for (const row of rows) {
            const doesOverlap = row.some(existingItem =>
                item.startDate < existingItem.endDate && item.endDate > existingItem.startDate
            );
            if (!doesOverlap) {
                row.push(item);
                placed = true;
                break;
            }
        }
        if (!placed) {
            rows.push([item]);
        }
    }
    return rows;
}

/**
 * Packs point-in-time events into rows to avoid label collisions.
 * @param {Array} events - A list of event items, sorted by startDate.
 * @param {function} timeScale - The time scale function.
 * @param {number} labelWidthThreshold - The minimum pixel distance between event labels on the same row.
 * @returns {Array<Array>} An array of rows, where each row is an array of non-colliding events.
 */
function packEventsIntoRows(events, timeScale, labelWidthThreshold = 150) {
    const rows = [];
    if (!events || events.length === 0) return rows;

    for (const event of events) {
        let placed = false;
        for (const row of rows) {
            const doesOverlap = row.some(existingEvent =>
                Math.abs(timeScale(event.startDate) - timeScale(existingEvent.startDate)) < labelWidthThreshold
            );
            if (!doesOverlap) {
                row.push(event);
                placed = true;
                break;
            }
        }
        if (!placed) {
            rows.push([event]);
        }
    }
    return rows;
}

/**
 * Renders the objective timeline Gantt chart.
 * @param {JQuery} html The jQuery object representing the sheet's HTML.
 * @param {ActorSheet} sheet The instance of the actor sheet.
 * @returns {object|null} An object with scope variables for interactivity, or null if rendering is not possible.
 */
function renderObjectiveTimeline(html, sheet) {
    const svgWrapper = html.find('.objective-panel')[0];
    const svg = html.find('.objective-panel .timeline-svg')[0];
    if (!svg || !svgWrapper) return null;
    
    const contentGroup = svg.querySelector('#timeline-content');
    const axisGroup = svg.querySelector('.timeline-axis-x');
    const separatorsGroup = svg.querySelector('.timeline-separators');
    if (!contentGroup || !axisGroup || !separatorsGroup) return null;

    const agesLane = svg.querySelector('.timeline-ages-lane');
    const experiencesLane = svg.querySelector('.timeline-experiences-lane');
    const eventsLane = svg.querySelector('.timeline-events-lane');
    if (!agesLane || !experiencesLane || !eventsLane) return null;

    const { width } = svg.getBoundingClientRect();
    if (width <= 0) return null; // Don't render if not visible
    const padding = { top: 40, right: 20, bottom: 10, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const svgNS = "http://www.w3.org/2000/svg";

    // 1. GATHER AND VALIDATE ITEMS
    const allEras = [], allExperiences = [], allEvents = [];
    const actorData = sheet.actor.system;

    Object.values(actorData.eras || {}).forEach(age => {
        const startDate = new Date(age.dateFrom);
        const endDate = new Date(age.dateTo);
        if (age.dateFrom && age.dateTo && isValidDate(startDate) && isValidDate(endDate) && startDate < endDate) {
            allEras.push({ type: 'era', ...age, startDate, endDate, id: age.id });
        }
        Object.values(age.experiences || {}).forEach(exp => {
            const expStartDate = new Date(exp.dateFrom);
            const expEndDate = new Date(exp.dateTo);
            if (exp.dateFrom && exp.dateTo && isValidDate(expStartDate) && isValidDate(expEndDate) && expStartDate < expEndDate) {
                allExperiences.push({ type: 'experience', ...exp, startDate: expStartDate, endDate: expEndDate, eraId: age.id, id: exp.id });
            }
            Object.values(exp.events || {}).forEach(event => {
                if (!event.isSpan && event.date) {
                    const eventTime = event.time || '00:00';
                    const eventDate = new Date(`${event.date}T${eventTime}`);
                    if (isValidDate(eventDate)) {
                        allEvents.push({ type: 'event', ...event, startDate: eventDate, eraId: age.id, expId: exp.id, id: event.id });
                    }
                }
            });
        });
    });

    const allItems = [...allEras, ...allExperiences, ...allEvents];
    if (allItems.length === 0) return null;

    allEras.sort((a, b) => a.startDate - b.startDate);
    allExperiences.sort((a, b) => a.startDate - b.startDate);
    allEvents.sort((a, b) => a.startDate - b.startDate);

    let minDate = new Date(allItems[0].startDate);
    let maxDate = new Date(allItems[0].endDate || allItems[0].startDate);
    allItems.forEach(item => {
        if (item.startDate < minDate) minDate = new Date(item.startDate);
        const itemEndDate = item.endDate || item.startDate;
        if (itemEndDate > maxDate) maxDate = new Date(itemEndDate);
    });
    
    // Add padding to the date range
    const paddedMinDate = new Date(minDate.getFullYear() - 1, 0, 1);
    const paddedMaxDate = new Date(maxDate.getFullYear() + 1, 11, 31);
    const totalDuration = paddedMaxDate.getTime() - paddedMinDate.getTime();
    if (totalDuration <= 0) return null;

    // A D3-like linear time scale function
    const timeScale = (date) => {
        if (!isValidDate(date)) return padding.left;
        return padding.left + (((date.getTime() - paddedMinDate.getTime()) / totalDuration) * chartWidth);
    };
    timeScale.invert = (pixel) => {
        const ratio = (pixel - padding.left) / chartWidth;
        return new Date(paddedMinDate.getTime() + (totalDuration * ratio));
    };

    const eraRows = packItemsIntoRows(allEras);
    const experienceRows = packItemsIntoRows(allExperiences);
    const eventRows = packEventsIntoRows(allEvents, timeScale);

    agesLane.innerHTML = ''; experiencesLane.innerHTML = ''; eventsLane.innerHTML = ''; separatorsGroup.innerHTML = '';
    
    const barHeight = 25; const barPadding = 10; const lanePadding = 20;
    const eventLineHeight = 20; const eventLabelOffset = 20;

    const agesLaneHeight = Math.max(1, eraRows.length) * (barHeight + barPadding);
    const experiencesLaneHeight = Math.max(1, experienceRows.length) * (barHeight + barPadding);
    const eventsLaneHeight = Math.max(1, eventRows.length) * (eventLineHeight + eventLabelOffset + 10);

    const totalContentHeight = agesLaneHeight + experiencesLaneHeight + eventsLaneHeight + (lanePadding * 2);
    const totalSvgHeight = totalContentHeight + padding.top + padding.bottom;
    
    svg.setAttribute('viewBox', `0 0 ${width} ${totalSvgHeight}`);
    html.find('.timelines-panel-wrapper').css('height', `${totalSvgHeight}px`);

    let currentYOffset = padding.top;
    
    agesLane.setAttribute('transform', `translate(0, ${currentYOffset})`);
    eraRows.forEach((row, rowIndex) => {
        row.forEach(item => {
            const x = timeScale(item.startDate);
            const barWidth = timeScale(item.endDate) - x;
            if (barWidth <= 0) return;
            const y = rowIndex * (barHeight + barPadding);
            const group = document.createElementNS(svgNS, 'g');
            group.classList.add('timeline-item-group');
            group.dataset.itemId = item.id;
            group.dataset.itemType = 'era';

            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', y); rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight); rect.setAttribute('rx', barHeight / 2);
            rect.classList.add('timeline-era-bar');
            rect.dataset.originalX = x; rect.dataset.originalWidth = barWidth;
            
            const text = document.createElementNS(svgNS, 'text');
            const textX = x + barWidth / 2;
            text.setAttribute('x', textX); text.setAttribute('y', y + barHeight / 2);
            text.classList.add('timeline-label'); text.textContent = item.name || '';
            text.dataset.originalX = textX;

            group.appendChild(rect); group.appendChild(text); agesLane.appendChild(group);
        });
    });
    currentYOffset += agesLaneHeight + lanePadding;

    experiencesLane.setAttribute('transform', `translate(0, ${currentYOffset})`);
    experienceRows.forEach((row, rowIndex) => {
        row.forEach(item => {
            const x = timeScale(item.startDate);
            const barWidth = timeScale(item.endDate) - x;
            if (barWidth <= 0) return;
            const y = rowIndex * (barHeight + barPadding);
            const group = document.createElementNS(svgNS, 'g');
            group.classList.add('timeline-item-group');
            group.dataset.itemId = item.id;
            group.dataset.itemType = 'experience';
            group.dataset.eraId = item.eraId;

            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', y); rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight); rect.setAttribute('rx', barHeight / 2);
            rect.classList.add('timeline-exp-bar');
            rect.dataset.originalX = x; rect.dataset.originalWidth = barWidth;
            
            const text = document.createElementNS(svgNS, 'text');
            const textX = x + barWidth / 2;
            text.setAttribute('x', textX); text.setAttribute('y', y + barHeight / 2);
            text.classList.add('timeline-label'); text.textContent = item.name || '';
            text.dataset.originalX = textX;

            group.appendChild(rect); group.appendChild(text); experiencesLane.appendChild(group);
        });
    });
    currentYOffset += experiencesLaneHeight + lanePadding;

    eventsLane.setAttribute('transform', `translate(0, ${currentYOffset})`);
    eventRows.forEach((row, rowIndex) => {
        row.forEach((item, itemIndex) => {
            const x = timeScale(item.startDate);
            const y = rowIndex * (eventLineHeight + eventLabelOffset + 10);
            const staggerOffset = (itemIndex % 2) * eventLabelOffset; // Zig-zag effect
            
            const group = document.createElementNS(svgNS, 'g');
            group.classList.add('timeline-item-group');
            group.dataset.itemId = item.id;
            group.dataset.itemType = 'event';
            group.dataset.eraId = item.eraId;
            group.dataset.expId = item.expId;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', y);
            line.setAttribute('x2', x);
            line.setAttribute('y2', y + eventLineHeight + staggerOffset); // Line reaches label
            line.classList.add('timeline-event-marker');
            line.dataset.originalX = x;

            const text = document.createElementNS(svgNS, 'text');
            const textX = x + 5;
            text.setAttribute('x', textX);
            text.setAttribute('y', y + eventLineHeight + staggerOffset);
            text.classList.add('timeline-label', 'event-label');
            text.textContent = item.title || '';
            text.dataset.originalX = textX;
            
            group.appendChild(line); group.appendChild(text); eventsLane.appendChild(group);
        });
    });
    
    // Draw separator and axis lines that span the full width
    separatorsGroup.innerHTML = '';
    const separatorY1 = padding.top + agesLaneHeight + lanePadding / 2;
    const separatorY2 = padding.top + agesLaneHeight + lanePadding + experiencesLaneHeight + lanePadding / 2;
    const axisLineY = padding.top;
    
    [separatorY1, separatorY2, axisLineY].forEach(y => {
        if(y < totalSvgHeight) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            line.classList.add(y === axisLineY ? 'timeline-axis-line' : 'timeline-separator');
            separatorsGroup.appendChild(line);
        }
    });

    return { timeScale, minDate: paddedMinDate, maxDate: paddedMaxDate, width, totalSvgHeight };
}

export function initializeTimelines(html, sheet) {
  // Set up the single global listener for closing popovers.
  setupGlobalPopoverCloser();
  
  const $svg = html.find('.objective-panel .timeline-svg');
  if (!$svg.length) return;
  const svgEl = $svg[0];
  const $contentGroup = $svg.find('#timeline-content');
  if (!$contentGroup.length) return;

  const renderScope = renderObjectiveTimeline(html, sheet);
  if (!renderScope) {
    $svg.html('<text x="50%" y="50%" class="timeline-label" fill="#666">No timeline data to display.</text>');
    return;
  }
  
  const totalDurationMs = renderScope.maxDate.getTime() - renderScope.minDate.getTime();
  const maxZoom = totalDurationMs / (1000 * 60 * 60 * 24); // Allow zoom to a single day

  const allRects = $contentGroup.find('rect');
  const allTexts = $contentGroup.find('text');
  const allEventLines = $contentGroup.find('.timeline-event-marker');
  
  let transform = { k: 1, x: 0 };

  const applyTransform = () => {
    allRects.each(function() {
        const el = $(this);
        const originalX = parseFloat(el.data('originalX'));
        const originalWidth = parseFloat(el.data('originalWidth'));
        if (!isNaN(originalX) && !isNaN(originalWidth)) {
            el.attr('x', originalX * transform.k + transform.x);
            el.attr('width', originalWidth * transform.k);
        }
    });

    allTexts.each(function() {
        const el = $(this);
        const originalX = parseFloat(el.data('originalX'));
        if (!isNaN(originalX)) {
            el.attr('x', originalX * transform.k + transform.x);
        }
    });

    allEventLines.each(function() {
        const el = $(this);
        const originalX = parseFloat(el.data('originalX'));
        if (!isNaN(originalX)) {
            const newX = originalX * transform.k + transform.x;
            el.attr('x1', newX);
            el.attr('x2', newX);
        }
    });

    drawXAxis(svgEl, transform, renderScope.timeScale, renderScope.minDate, renderScope.maxDate, renderScope.width, renderScope.totalSvgHeight);
  };

  applyTransform();

  // --- POPOVER LOGIC ---
  html.find('.timeline-item-group').off('click.timelinePopover').on('click.timelinePopover', function(event) {
      event.stopPropagation(); // Prevent the global closer from firing immediately.

      const itemGroup = event.currentTarget;
      
      // ROBUSTNESS FIX: Find the popover relative to the sheet's root element, not the clicked SVG item.
      // This avoids SVG-to-HTML traversal issues and stale closures.
      const $popover = $(sheet.form).find('.timeline-popover');
      
      if ($popover.length === 0) {
          console.error(`Continuum Timeline | Popover not found for sheet: ${sheet.actor.name}`);
          return;
      }

      const isThisPopoverAlreadyOpen = $popover.is(':visible') && $popover.data('currentItemId') === itemGroup.dataset.itemId;

      // First, close all other popovers across all open sheets.
      $('.timeline-popover').not($popover).hide();

      // If the click was on the item for the already-open popover, toggle it closed and stop.
      if (isThisPopoverAlreadyOpen) {
          $popover.hide();
          return;
      }
      
      // --- Now, populate and show the popover ---
      const { itemId, itemType, eraId, expId } = itemGroup.dataset;
      const actorData = sheet.actor.system;

      let itemData, pathPrefix, nameField, notesField;

      // Reset popover state
      $popover.removeClass('is-era is-experience is-event');
      $popover.find('[data-name]').val('').attr('name', '');
      $popover.find('.popover-date-field').show();
      $popover.find('.popover-notes').show();
      $popover.find('input[type="time"]').hide();
      $popover.find('.popover-date-field[data-field="from"] label').text('From');
      $popover.data('currentItemId', itemId);

      if (itemType === 'era') {
          itemData = actorData.eras?.[itemId]; pathPrefix = `system.eras.${itemId}`; nameField = 'name';
          $popover.addClass('is-era');
      } else if (itemType === 'experience') {
          itemData = actorData.eras?.[eraId]?.experiences?.[itemId]; pathPrefix = `system.eras.${eraId}.experiences.${itemId}`; nameField = 'name'; notesField = 'description';
          $popover.addClass('is-experience');
      } else if (itemType === 'event') {
          itemData = actorData.eras?.[eraId]?.experiences?.[expId]?.events?.[itemId]; pathPrefix = `system.eras.${eraId}.experiences.${expId}.events.${itemId}`; nameField = 'title'; notesField = 'notes';
          $popover.addClass('is-event');
          $popover.find('.popover-date-field[data-field="from"] label').text('Date');
      }
      
      if (!itemData) return;

      // Populate fields
      if (nameField) $popover.find('.popover-title').attr('name', `${pathPrefix}.${nameField}`).val(itemData[nameField] || '');
      if (notesField) $popover.find('.popover-notes').attr('name', `${pathPrefix}.${notesField}`).val(itemData[notesField] || '');
      if (itemType === 'event') {
          $popover.find('input[data-name="dateFrom"]').attr('name', `${pathPrefix}.date`).val(itemData.date || '');
          $popover.find('input[data-name="timeFrom"]').attr('name', `${pathPrefix}.time`).val(itemData.time || '');
      } else {
          $popover.find('input[data-name="dateFrom"]').attr('name', `${pathPrefix}.dateFrom`).val(itemData.dateFrom || '');
          $popover.find('input[data-name="dateTo"]').attr('name', `${pathPrefix}.dateTo`).val(itemData.dateTo || '');
      }

      // Position and show popover
      const itemRect = itemGroup.getBoundingClientRect();
      // ROBUSTNESS FIX: Find the wrapper relative to the sheet's root element.
      const wrapperEl = $(sheet.form).find('.timelines-panel-wrapper')[0];
      const wrapperRect = wrapperEl.getBoundingClientRect();
      
      const top = itemRect.bottom - wrapperRect.top + 5;
      let left = itemRect.left - wrapperRect.left;
      if (left + 350 > wrapperRect.width) left = wrapperRect.width - 360;
      if (left < 0) left = 5;
      
      $popover.css({ top: `${top}px`, left: `${left}px` }).show();
  });


  // --- PAN AND ZOOM LOGIC ---
  let isPointerDown = false;
  let pointerOriginX = 0;
  let startTransformX = 0;

  $svg.on('pointerdown', (event) => {
    if (event.target.closest('.timeline-item-group')) return; // Don't pan when clicking an item
    if (event.button !== 0) return;
    isPointerDown = true;
    pointerOriginX = event.clientX;
    startTransformX = transform.x;
    $svg.addClass('grabbing');
    svgEl.setPointerCapture(event.pointerId);
  });
  
  const onPointerMove = (event) => {
    if (!isPointerDown) return;
    event.preventDefault();
    const deltaX = event.clientX - pointerOriginX;
    transform.x = Math.min(0, Math.max(startTransformX + deltaX, renderScope.width * (1 - transform.k)));
    applyTransform();
  };
  
  const onPointerUp = (event) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    $svg.removeClass('grabbing');
    if (svgEl.hasPointerCapture(event.pointerId)) {
      svgEl.releasePointerCapture(event.pointerId);
    }
  };

  $svg.on('pointermove', onPointerMove);
  $svg.on('pointerup', onPointerUp);
  $svg.on('pointerleave', onPointerUp);

  $svg.on('wheel', (event) => {
    event.preventDefault();
    $('.timeline-popover').hide(); // Close popover on zoom

    const zoomFactor = 1.1;
    const oldScale = transform.k;
    
    if (event.originalEvent.deltaY < 0) transform.k *= zoomFactor;
    else transform.k /= zoomFactor;
    transform.k = Math.max(1, Math.min(transform.k, maxZoom));
    
    const pointerX = event.originalEvent.offsetX;
    const pointUnderPointer = (pointerX - transform.x) / oldScale;
    transform.x = pointerX - pointUnderPointer * transform.k;
    transform.x = Math.min(0, Math.max(transform.x, renderScope.width * (1 - transform.k)));

    applyTransform();
  });
}