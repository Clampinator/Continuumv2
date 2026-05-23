/*
Assigns a token's current map position to a specific event on the actor's
lifeline. This is the core of the token-first geographic workflow: the
player drags their token to a place, then stamps that position onto any
event they choose.

Two entry points:
1. Token context menu "Assign Location to Event..." - picks from all events
2. Marker context menu "Update from Token" - updates one specific event

Both decode the event's path in the actor data and write lat/lng directly.
The updateActor hook then fires keyframe sync and marker refresh automatically.
*/

/*
Walk all events in the actor's eras, building a flat list with full paths.
Returns array of { eraId, expId, eventId, event, path } objects.
path is the Foundry update path prefix (without the lat/lng leaf).
*/
function collectAllEventsWithPaths(actor) {
  const list = [];
  for (const [eraId, era] of Object.entries(actor.system.eras || {})) {
    for (const [eventId, evt] of Object.entries(era.events || {})) {
      list.push({
        eraId,
        expId: null,
        eventId,
        event: evt,
        path: `system.eras.${eraId}.events.${eventId}`,
        isSpan: !!evt.eventIsSpan
      });
    }
    for (const [expId, exp] of Object.entries(era.experiences || {})) {
      for (const [eventId, evt] of Object.entries(exp.events || {})) {
        list.push({
          eraId,
          expId,
          eventId,
          event: evt,
          path: `system.eras.${eraId}.experiences.${expId}.events.${eventId}`,
          isSpan: !!evt.eventIsSpan
        });
      }
    }
  }
  return list;
}

/*
Format an event for display in the picker dialog.
*/
function _eventLabel(evt) {
  const title = evt.eventTitle || 'Untitled';
  const date = evt.eventIsSpan
    ? (evt.eventSpanFromDate || '?')
    : (evt.eventDate || '?');
  return `${title} (${date})`;
}

/*
Assign lat/lng to a level event via actor.update.
*/
async function _assignLevelEvent(actor, path, lat, lng) {
  await actor.update({
    [`${path}.lat`]: lat,
    [`${path}.lng`]: lng
  });
}

/*
Assign lat/lng to a span event. role is 'from', 'to', or 'both'.
*/
async function _assignSpanEvent(actor, path, lat, lng, role) {
  const update = {};
  if (role === 'from' || role === 'both') {
    update[`${path}.eventSpanFromLat`] = lat;
    update[`${path}.eventSpanFromLng`] = lng;
  }
  if (role === 'to' || role === 'both') {
    update[`${path}.eventSpanToLat`] = lat;
    update[`${path}.eventSpanToLng`] = lng;
  }
  await actor.update(update);
}

/*
Read the token's current lat/lng from flags.
Returns { lat, lng } or null.
*/
function _readTokenPosition(tokenDoc) {
  const latlng = tokenDoc.getFlag('spacetime', 'latlng');
  if (!latlng || latlng.lat == null || latlng.lng == null) return null;
  return { lat: Number(latlng.lat), lng: Number(latlng.lng) };
}

/*
Open a dialog listing all events for an actor. On selection,
writes the token's current position to the chosen event.
Called from the token context menu.
*/
export async function openEventPicker(actor, tokenDoc) {
  const pos = _readTokenPosition(tokenDoc);
  if (!pos) {
    ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.TokenNoPosition"));
    return;
  }

  if (!(game.user.isGM || actor.isOwner)) {
    ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.NoPermissionToEdit"));
    return;
  }

  const events = collectAllEventsWithPaths(actor);
  if (events.length === 0) {
    ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.NoEventsToAssign"));
    return;
  }

  // Group by era for readability
  const byEra = {};
  for (const e of events) {
    const era = actor.system.eras[e.eraId];
    const eraName = era?.eraTitle || era?.name || e.eraId;
    if (!byEra[eraName]) byEra[eraName] = [];
    byEra[eraName].push(e);
  }

  const rows = [];
  for (const [eraName, eraEvents] of Object.entries(byEra)) {
    rows.push(`<optgroup label="${foundry.utils.escapeHTML(eraName)}">`);
    for (const e of eraEvents) {
      const spanTag = e.isSpan ? ' [Span]' : '';
      rows.push(`<option value="${e.path}" data-is-span="${e.isSpan}">${
        foundry.utils.escapeHTML(_eventLabel(e.event))
      }${spanTag}</option>`);
    }
    rows.push('</optgroup>');
  }

  const content = `
    <div class="form-group">
      <label>${game.i18n.localize("CONTINUUM.Notifications.AssignLocationToEvent")}</label>
      <select id="continuum-assign-event-select" style="width:100%;max-width:100%">
        ${rows.join('')}
      </select>
    </div>
    <div id="continuum-assign-span-role" style="display:none;margin-top:6px">
      <label>${game.i18n.localize("CONTINUUM.Notifications.AssignAsLabel")}</label>
      <select id="continuum-assign-span-role-select" style="width:100%">
        <option value="both">${game.i18n.localize("CONTINUUM.Notifications.BothDepartureArrival")}</option>
        <option value="from">${game.i18n.localize("CONTINUUM.Notifications.DepartureOnly")}</option>
        <option value="to">${game.i18n.localize("CONTINUUM.Notifications.ArrivalOnly")}</option>
      </select>
    </div>
    <p class="notes" style="margin-top:4px">
      ${game.i18n.format("CONTINUUM.Notifications.TokenPosition", {lat: pos.lat.toFixed(4), lng: pos.lng.toFixed(4)})}
    </p>`;

  new Dialog({
    title: game.i18n.format("CONTINUUM.Notifications.AssignLocationTitle", {name: actor.name}),
    content,
    buttons: {
      assign: {
        icon: '<i class="fas fa-map-pin"></i>',
        label: game.i18n.localize("CONTINUUM.Notifications.Assign"),
        callback: async (html) => {
          const select = html.find('#continuum-assign-event-select')[0];
          const path = select.value;
          if (!path) return;
          const isSpan = select.selectedOptions[0]?.dataset.isSpan === 'true';
          if (isSpan) {
            const role = html.find('#continuum-assign-span-role-select').val();
            await _assignSpanEvent(actor, path, pos.lat, pos.lng, role);
          } else {
            await _assignLevelEvent(actor, path, pos.lat, pos.lng);
          }
          ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.LocationAssignedToEvent"));
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("CONTINUUM.Common.Cancel")
      }
    },
    default: 'assign',
    render: (html) => {
      // Toggle span role selector when a span event is chosen
      html.find('#continuum-assign-event-select').on('change', (ev) => {
        const isSpan = ev.target.selectedOptions[0]?.dataset.isSpan === 'true';
        html.find('#continuum-assign-span-role').toggle(isSpan);
      });
    }
  }).render(true);
}

/*
Update a specific event's location from the token's current position.
Decodes the marker key to find the event path.
Called from the marker context menu.

markerKey format:
  Level: {actorId}:{eraId}:{eventId}  OR  {actorId}:{eraId}:{expId}:{eventId}
  Span from: ...:from   Span to: ...:to
  Birth: {actorId}:birth  (not handled here - birth is in system.personal)
*/
export async function updateEventFromToken(actor, tokenDoc, markerKey) {
  const pos = _readTokenPosition(tokenDoc);
  if (!pos) {
    ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.TokenNoPositionDragFirst"));
    return;
  }

  if (!(game.user.isGM || actor.isOwner)) {
    ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.NoPermissionToEdit"));
    return;
  }

  // Decode marker key into path components
  // Strip actorId prefix
  const parts = markerKey.split(':');
  if (parts.length < 2) return;
  const actorId = parts[0];

  // Birthplace - write to system.personal
  if (parts[1] === 'birth') {
    await actor.update({
      'system.personal.birthLat': pos.lat,
      'system.personal.birthLng': pos.lng
    });
    ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.BirthplaceUpdatedFromToken"));
    return;
  }

  // Determine event path and span role
  const tail = parts.slice(1); // [eraId, ...rest]
  const eraId = tail[0];
  let isSpanRole = false;
  let spanRole = null;
  let eventId = null;
  let expId = null;

  // Check if last part is 'from' or 'to' (span role suffix)
  const last = tail[tail.length - 1];
  if (last === 'from' || last === 'to') {
    isSpanRole = true;
    spanRole = last;
    tail.pop();
  }

  // After stripping span role:
  // [eraId, eventId] = era-level event
  // [eraId, expId, eventId] = experience-level event
  if (tail.length === 2) {
    eventId = tail[1];
  } else if (tail.length === 3) {
    expId = tail[1];
    eventId = tail[2];
  } else {
    console.error('Continuum | Cannot decode marker key:', markerKey);
    return;
  }

  // Look up the event to check if it's a span
  let evt;
  if (expId) {
    evt = actor.system.eras?.[eraId]?.experiences?.[expId]?.events?.[eventId];
  } else {
    evt = actor.system.eras?.[eraId]?.events?.[eventId];
  }
  if (!evt) {
    console.error('Continuum | Event not found for marker key:', markerKey);
    return;
  }

  const basePath = expId
    ? `system.eras.${eraId}.experiences.${expId}.events.${eventId}`
    : `system.eras.${eraId}.events.${eventId}`;

  if (evt.eventIsSpan) {
    // For span events, the marker key's role suffix tells us which end to update
    const latField = spanRole === 'to' ? 'eventSpanToLat' : 'eventSpanFromLat';
    const lngField = spanRole === 'to' ? 'eventSpanToLng' : 'eventSpanFromLng';
    await actor.update({
      [`${basePath}.${latField}`]: pos.lat,
      [`${basePath}.${lngField}`]: pos.lng
    });
  } else {
    await _assignLevelEvent(actor, basePath, pos.lat, pos.lng);
  }

  const label = evt.eventTitle || 'Event';
  ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.LocationUpdatedFromToken", {label}));
}

/*
Hook handler for spacetime.tokenContextMenu.
Returns an array of menu items to inject into the token's right-click menu.
*/
export function getTokenContextMenuItems(tokenDoc) {
  const actor = tokenDoc.actor;
  if (!actor) return [];
  // Only for actors in continuum-v2 that are linked
  if (!['character', 'organization', 'location'].includes(actor.type)) return [];
  if (!(actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false)) return [];
  if (!(game.user.isGM || actor.isOwner)) return [];

  return [{
    label: game.i18n.localize("CONTINUUM.Notifications.AssignLocationToEvent") + '...',
    icon: 'fas fa-map-pin',
    callback: () => openEventPicker(actor, tokenDoc)
  }];
}