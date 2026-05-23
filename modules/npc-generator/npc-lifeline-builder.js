function rid() {
  return foundry.utils.randomID();
}

import { getCurrentSpanCapacity, computeSpanCost } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatObjectiveTime } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

function eraToYearRange(era) {
  const eraMap = {
    'Ancient': [-4000, -500],
    'Ariesian': [-2000, 1],
    'Tauran': [-4000, -2000],
    'Piscean': [1, 2000],
    'Medieval': [400, 1450],
    'Aquarian': [2000, 3000]
  };
  return eraMap[era] || [1900, 2024];
}

const EXPERIENCE_COLORS = [
  '#4da6ff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8',
  '#ff922b', '#20c997', '#748ffc', '#f06595', '#94d82d'
];

function buildEras(foundryJson, wizardData) {
  const { npcType, era, dob } = wizardData;
  const isLeveler = npcType === 'Leveler';
  const isMentor = npcType === 'Mentor';
  const [eraStart, eraEnd] = eraToYearRange(era);

  const birthYear = dob ? parseInt(dob.split('-')[0]) : eraStart + Math.floor(Math.random() * Math.max(1, (eraEnd - eraStart) * 0.3));

  const aiEras = foundryJson?.eras || foundryJson?.ages;
  if (aiEras && (Array.isArray(aiEras) ? aiEras.length > 0 : Object.keys(aiEras).length > 0)) {
    const result = processAIProvidedEras(aiEras, wizardData);
    if (result && Object.keys(result).length > 0) return result;
  }

  const eras = {};
  const ageDefinitions = isLeveler
    ? [
        { name: 'Childhood', pctStart: 0, pctEnd: 0.25 },
        { name: 'Adolescence', pctStart: 0.25, pctEnd: 0.45 },
        { name: 'Young Adulthood', pctStart: 0.45, pctEnd: 0.7 },
        { name: 'Adulthood', pctStart: 0.7, pctEnd: 1.0 }
      ]
    : isMentor
    ? [
        { name: 'Childhood', pctStart: 0, pctEnd: 0.15 },
        { name: 'Novice Years', pctStart: 0.15, pctEnd: 0.35 },
        { name: 'Rising Service', pctStart: 0.35, pctEnd: 0.55 },
        { name: 'Senior Service', pctStart: 0.55, pctEnd: 0.75 },
        { name: 'Mentorship', pctStart: 0.75, pctEnd: 1.0 }
      ]
    : [
        { name: 'Childhood', pctStart: 0, pctEnd: 0.2 },
        { name: 'Novice Years', pctStart: 0.2, pctEnd: 0.45 },
        { name: 'Active Service', pctStart: 0.45, pctEnd: 0.75 },
        { name: 'Later Years', pctStart: 0.75, pctEnd: 1.0 }
      ];

  let sortCounter = 1000;
  ageDefinitions.forEach(def => {
    const eraId = rid();
    const yearFrom = birthYear + Math.floor(def.pctStart * 30);
    const yearTo = birthYear + Math.floor(def.pctEnd * 50);
    eras[eraId] = {
      id: eraId,
      name: def.name,
      sort: sortCounter,
      dateFrom: `${yearFrom}-01-01`,
      dateTo: `${yearTo}-12-31`,
      events: {},
      experiences: {}
    };
    sortCounter += 1000;
  });

  return eras;
}

function nextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function processAIProvidedEras(aiEras, wizardData) {
  const { dob } = wizardData;
  const birthDate = dob || '1900-01-01';

  const eraList = Array.isArray(aiEras) ? aiEras : Object.values(aiEras);
  const namedEras = eraList.filter(a => a && a.name);

  if (namedEras.length === 0) return null;

  namedEras.sort((a, b) => {
    const aDate = a.dateFrom || a.dateTo || birthDate;
    const bDate = b.dateFrom || b.dateTo || birthDate;
    return aDate.localeCompare(bDate);
  });

  const eras = {};
  let sortCounter = 1000;

  for (let i = 0; i < namedEras.length; i++) {
    const eraData = namedEras[i];
    const eraId = eraData.id || rid();
    let dateFrom = eraData.dateFrom || '';
    let dateTo = eraData.dateTo || '';

    if (!dateFrom && i === 0) dateFrom = birthDate;
    if (!dateTo && i === namedEras.length - 1) dateTo = '2100-12-31';
    if (!dateFrom) dateFrom = birthDate;
    if (!dateTo) dateTo = '2100-12-31';

    eras[eraId] = {
      id: eraId,
      name: eraData.name,
      sort: sortCounter,
      dateFrom,
      dateTo,
      events: {},
      experiences: {}
    };
    sortCounter += 1000;
  }

  const eraIds = Object.keys(eras);
  for (let i = 0; i < eraIds.length; i++) {
    if (i === 0) {
      if (!eras[eraIds[0]].dateFrom || eras[eraIds[0]].dateFrom === birthDate) {
        eras[eraIds[0]].dateFrom = birthDate;
      }
    } else {
      const prevDateTo = eras[eraIds[i - 1]].dateTo;
      const thisDateFrom = eras[eraIds[i]].dateFrom;
      if (!thisDateFrom || thisDateFrom <= prevDateTo) {
        eras[eraIds[i]].dateFrom = nextDay(prevDateTo);
      }
    }

    if (i < eraIds.length - 1) {
      const nextDateFrom = eras[eraIds[i + 1]].dateFrom;
      const thisDateTo = eras[eraIds[i]].dateTo;
      if (!thisDateTo || thisDateTo >= nextDateFrom) {
        eras[eraIds[i]].dateTo = prevDay(nextDateFrom);
      }
    }
  }
  eras[eraIds[eraIds.length - 1]].dateTo = eras[eraIds[eraIds.length - 1]].dateTo || '2100-12-31';

  return eras;
}

function buildExpMapFromAI(foundryJson) {
  const expMap = new Map();
  const aiExperiences = foundryJson?.experiences;

  if (aiExperiences && typeof aiExperiences === 'object') {
    if (Array.isArray(aiExperiences)) {
      let colorIdx = 0;
      for (const expData of aiExperiences) {
        if (!expData?.name) continue;
        const expId = rid();
        expMap.set(expData.name, {
          id: expId,
          name: expData.name,
          description: expData.description || '',
          dateFrom: expData.dateFrom || '',
          dateTo: expData.dateTo || '',
          location: expData.location || '',
          color: EXPERIENCE_COLORS[colorIdx % EXPERIENCE_COLORS.length],
          hasStartEvent: false,
          hasEndEvent: false
        });
        colorIdx++;
      }
    } else {
      let colorIdx = 0;
      for (const [, expData] of Object.entries(aiExperiences)) {
        if (!expData?.name) continue;
        const expId = rid();
        expMap.set(expData.name, {
          id: expId,
          name: expData.name,
          description: expData.description || '',
          dateFrom: expData.dateFrom || expData.date || '',
          dateTo: expData.dateTo || '',
          location: expData.location || '',
          color: EXPERIENCE_COLORS[colorIdx % EXPERIENCE_COLORS.length],
          hasStartEvent: false,
          hasEndEvent: false
        });
        colorIdx++;
      }
    }
  }

  if (foundryJson?.lifelineEvents && Array.isArray(foundryJson.lifelineEvents)) {
    for (const evt of foundryJson.lifelineEvents) {
      const expName = evt.experienceId;
      if (!expName) continue;

      if (!expMap.has(expName)) {
        const expId = rid();
        expMap.set(expName, {
          id: expId,
          name: expName,
          description: '',
          dateFrom: '',
          dateTo: '',
          location: '',
          color: EXPERIENCE_COLORS[expMap.size % EXPERIENCE_COLORS.length],
          hasStartEvent: false,
          hasEndEvent: false
        });
      }

      const exp = expMap.get(expName);
      if (evt.isExpStart) {
        exp.hasStartEvent = true;
        if (!exp.dateFrom) exp.dateFrom = evt.date || '';
        if (!exp.location) exp.location = evt.location || '';
      }
      if (evt.isExpEnd) {
        exp.hasEndEvent = true;
        if (!exp.dateTo) exp.dateTo = evt.date || '';
        if (!exp.location) exp.location = evt.location || '';
      }
    }
  }

  return expMap;
}

function buildEvents(foundryJson, wizardData, ages, geoMap, addLog) {
  const { npcType, era } = wizardData;

  const expMap = buildExpMapFromAI(foundryJson);

  const rawEvents = [];

  for (const [expName, exp] of expMap) {
    if (!exp.hasStartEvent && exp.dateFrom) {
      rawEvents.push({
        eventTitle: `${exp.name} (Start)`,
        eventNotes: exp.description || `Began ${exp.name}`,
        date: exp.dateFrom,
        time: '12:00:00',
        location: exp.location || '',
        eventIsSpan: false,
        eventIsRest: false,
        sort: 0,
        _isExpStart: true,
        _expId: exp.id,
        _expName: exp.name,
        _expColor: exp.color,
        _expStartDate: exp.dateFrom,
        _expEndDate: exp.dateTo
      });
    }

    if (!exp.hasEndEvent && exp.dateTo) {
      rawEvents.push({
        eventTitle: `${exp.name} (End)`,
        eventNotes: `End of ${exp.name}`,
        date: exp.dateTo,
        time: '12:00:00',
        location: exp.location || '',
        eventIsSpan: false,
        eventIsRest: false,
        sort: 0,
        _isExpEnd: true,
        _expId: exp.id,
        _expName: exp.name,
        _expColor: exp.color,
        _expStartDate: exp.dateFrom,
        _expEndDate: exp.dateTo
      });
    }
  }

  if (foundryJson?.lifelineEvents && Array.isArray(foundryJson.lifelineEvents)) {
    for (const evt of foundryJson.lifelineEvents) {
      const converted = buildEventFromAI(evt, era);
      const expName = evt.experienceId;
      if (expName && expMap.has(expName)) {
        converted._expId = expMap.get(expName).id;
        if (!converted._expName) converted._expName = expName;
        if (!converted._expColor) converted._expColor = expMap.get(expName).color;
        if (evt.isExpStart) {
          converted._isExpStart = true;
          converted._expStartDate = expMap.get(expName).dateFrom;
          converted._expEndDate = expMap.get(expName).dateTo;
        }
        if (evt.isExpEnd) {
          converted._isExpEnd = true;
        }
      }
      rawEvents.push(converted);
    }
  }

  if (foundryJson?.events && Array.isArray(foundryJson.events)) {
    for (const evt of foundryJson.events) {
      rawEvents.push(buildEventFromAI(evt, era));
    }
  }

  const aiExperiences = foundryJson?.experiences;
  if (aiExperiences && typeof aiExperiences === 'object' && !Array.isArray(aiExperiences)) {
    for (const [, expData] of Object.entries(aiExperiences)) {
      if (!expData?.name) continue;
      const exp = expMap.get(expData.name);
      if (!exp) continue;
      if (expData.events && Array.isArray(expData.events)) {
        for (const evt of expData.events) {
          const converted = buildEventFromAI(evt, era);
          converted._expId = exp.id;
          converted._expName = exp.name;
          converted._expColor = exp.color;
          rawEvents.push(converted);
        }
      }
    }
  }

  rawEvents.sort((a, b) => {
    const dateA = a.date || '9999-99-99';
    const dateB = b.date || '9999-99-99';
    return dateA.localeCompare(dateB);
  });

  const seenTimestamps = new Set();
  for (const evt of rawEvents) {
    if (!evt.date) continue;
    let ts = `${evt.date}T${evt.time || '12:00:00'}`;
    let offset = 0;
    while (seenTimestamps.has(ts)) {
      offset++;
      const base = new Date(`${evt.date}T${evt.time || '12:00:00'}`);
      if (!isNaN(base.getTime())) {
        base.setSeconds(base.getSeconds() + offset);
        const pad = (n, w = 2) => String(n).padStart(w, '0');
        ts = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}:${pad(base.getSeconds())}`;
        evt.date = ts.split('T')[0];
        evt.time = ts.split('T')[1];
      } else {
        ts = `${evt.date}T12:00:${String(offset).padStart(2, '0')}`;
      }
    }
    seenTimestamps.add(ts);
  }

  const eraKeys = Object.keys(ages);
  const eraEntries = eraKeys.map(k => ages[k]);

  let eventSort = 500;
  const processedEras = JSON.parse(JSON.stringify(ages));

  for (const evt of rawEvents) {
    const loc = evt.location;
    if (loc) {
      const geo = geoMap.get(loc) || geoMap.get(loc.toLowerCase());
      if (geo && geo.lat !== null) {
        evt.lat = geo.lat;
        evt.lng = geo.lng;
        evt.zoom = geo.zoom || 12;
      }
    }

    if (evt.eventIsSpan && evt.eventSpanFromLocation) {
      const fromGeo = geoMap.get(evt.eventSpanFromLocation) || geoMap.get(evt.eventSpanFromLocation.toLowerCase());
      if (fromGeo && fromGeo.lat !== null) {
        evt.eventSpanFromLat = fromGeo.lat;
        evt.eventSpanFromLng = fromGeo.lng;
        evt.eventSpanFromZoom = fromGeo.zoom || 12;
      }
      if (evt.eventSpanToLocation) {
        const toGeo = geoMap.get(evt.eventSpanToLocation) || geoMap.get(evt.eventSpanToLocation.toLowerCase());
        if (toGeo && toGeo.lat !== null) {
          evt.eventSpanToLat = toGeo.lat;
          evt.eventSpanToLng = toGeo.lng;
          evt.eventSpanToZoom = toGeo.zoom || 12;
        }
      }
    }

    const targetEra = findEraForDate(evt.date, eraEntries);
    const eraId = eraIdForDate(evt.date, eraKeys, eraEntries);
    if (!targetEra || !eraId) {
      console.warn(`[NPC Lifeline] Could not place event "${evt.eventTitle}" @ ${evt.date} in any era. Eras:`, eraEntries.map(a => `${a.name}(${a.dateFrom}-${a.dateTo})`));
      continue;
    }
    const eventId = rid();

    const eventObj = {
      id: eventId,
      eventTitle: evt.eventTitle || 'Event',
      eventNotes: evt.eventNotes || evt.description || '',
      date: evt.date || '',
      time: evt.time || '12:00:00',
      location: evt.location || '',
      lat: evt.lat || null,
      lng: evt.lng || null,
      zoom: evt.zoom || 12,
      eventIsSpan: evt.eventIsSpan || false,
      eventIsRest: evt.eventIsRest || false,
      sort: eventSort,
      createdAt: Date.now(),
      age: 0
    };

    if (evt.eventIsSpan) {
      eventObj.eventSpanFromDate = evt.eventSpanFromDate || evt.date || '';
      eventObj.eventSpanFromTime = evt.eventSpanFromTime || '12:00:00';
      eventObj.eventSpanFromLocation = evt.eventSpanFromLocation || evt.location || '';
      eventObj.eventSpanFromLat = evt.eventSpanFromLat || evt.lat || null;
      eventObj.eventSpanFromLng = evt.eventSpanFromLng || evt.lng || null;
      eventObj.eventSpanFromZoom = evt.eventSpanFromZoom || 12;
      eventObj.eventSpanToDate = evt.eventSpanToDate || '';
      eventObj.eventSpanToTime = evt.eventSpanToTime || '12:00:00';
      eventObj.eventSpanToLocation = evt.eventSpanToLocation || '';
      eventObj.eventSpanToLat = evt.eventSpanToLat || null;
      eventObj.eventSpanToLng = evt.eventSpanToLng || null;
      eventObj.eventSpanToZoom = evt.eventSpanToZoom || 12;
    }

    if (evt._isExpStart) {
      const expId = evt._expId;
      if (!processedEras[eraId].experiences[expId]) {
        processedEras[eraId].experiences[expId] = {
          id: expId,
          name: evt._expName || 'Unknown Experience',
          sort: eventSort - 100,
          dateFrom: evt._expStartDate || evt.date || '',
          dateTo: evt._expEndDate || '',
          isOngoing: !evt._expEndDate,
          color: evt._expColor || '',
          events: {}
        };
      }
      processedEras[eraId].experiences[expId].events[eventId] = eventObj;
      eventObj.startsExpId = expId;
    } else if (evt._isExpEnd) {
      const expId = evt._expId;
      let foundExp = null;
      let foundEraId = null;
      for (const [aId, eraData] of Object.entries(processedEras)) {
        if (eraData.experiences[expId]) {
          foundExp = eraData.experiences[expId];
          foundEraId = aId;
          break;
        }
      }
      if (foundExp) {
        const targetEraId = foundEraId || eraId;
        processedEras[targetEraId].experiences[expId].events[eventId] = eventObj;
        processedEras[targetEraId].experiences[expId].dateTo = evt.date || '';
        processedEras[targetEraId].experiences[expId].isOngoing = false;
      } else {
        processedEras[eraId].events[eventId] = eventObj;
      }
    } else if (evt._expId) {
      const expId = evt._expId;
      let foundExp = null;
      let foundEraId = null;
      for (const [aId, eraData] of Object.entries(processedEras)) {
        if (eraData.experiences[expId]) {
          foundExp = eraData.experiences[expId];
          foundEraId = aId;
          break;
        }
      }
      if (foundExp) {
        const targetEraId = foundEraId || eraId;
        processedEras[targetEraId].experiences[expId].events[eventId] = eventObj;
      } else {
        processedEras[eraId].events[eventId] = eventObj;
      }
    } else {
      processedEras[eraId].events[eventId] = eventObj;
    }

    eventSort += 1000;
  }

  for (const [, eraData] of Object.entries(processedEras)) {
    for (const [, expData] of Object.entries(eraData.experiences)) {
      if (!expData.isOngoing && !expData.dateTo) {
        expData.dateTo = expData.dateFrom;
      }
    }
  }

  return processedEras;
}

function buildEventFromAI(evt, era) {
  const eventIsSpan = evt.eventIsSpan || false;
  const expId = evt.experienceId || evt._expId || null;
  return {
    eventTitle: evt.eventTitle || evt.name || 'Event',
    eventNotes: evt.eventNotes || evt.description || '',
    date: evt.date || '',
    time: evt.time || '12:00:00',
    location: evt.location || '',
    lat: null,
    lng: null,
    zoom: 12,
    eventIsSpan: eventIsSpan,
    eventIsRest: false,
    eventSpanFromDate: evt.eventSpanFromDate || '',
    eventSpanFromTime: evt.eventSpanFromTime || '12:00:00',
    eventSpanFromLocation: evt.eventSpanFromLocation || '',
    eventSpanFromLat: null,
    eventSpanFromLng: null,
    eventSpanFromZoom: 12,
    eventSpanToDate: evt.eventSpanToDate || '',
    eventSpanToTime: evt.eventSpanToTime || '12:00:00',
    eventSpanToLocation: evt.eventSpanToLocation || '',
    eventSpanToLat: null,
    eventSpanToLng: null,
    eventSpanToZoom: 12,
    _expId: expId,
    _isExpStart: evt.isExpStart || evt._isExpStart || false,
    _isExpEnd: evt.isExpEnd || evt._isExpEnd || false,
    _expName: evt.experienceId || evt._expName || null
  };
}

function findEraForDate(dateStr, eraEntries) {
  if (!dateStr || !eraEntries.length) return eraEntries[0] || null;
  for (const era of eraEntries) {
    if (dateStr >= (era.dateFrom || '') && dateStr <= (era.dateTo || '9999')) {
      return era;
    }
  }
  if (dateStr < (eraEntries[0]?.dateFrom || '')) return eraEntries[0];
  return eraEntries[eraEntries.length - 1];
}

function eraIdForDate(dateStr, eraKeys, eraEntries) {
  const era = findEraForDate(dateStr, eraEntries);
  const idx = eraEntries.indexOf(era);
  return idx >= 0 ? eraKeys[idx] : eraKeys[0];
}

// KERNEL: Span pool capacity and cost computation
// No inline constants or date arithmetic for span pool math.

function enforceSpanPool(processedEras, spanRank, dob) {
  if (!spanRank || spanRank <= 0) return processedEras;

  // KERNEL: Capacity via ranked lookup
  const maxPool = getCurrentSpanCapacity(spanRank);
  if (maxPool <= 0) return processedEras;

  let spentInCurrentCycle = 0;
  let restCount = 0;

  const allEvents = [];
  for (const [eraId, eraData] of Object.entries(processedEras)) {
    for (const [eventId, eventData] of Object.entries(eraData.events || {})) {
      allEvents.push({ eraId, expId: null, eventId, ...eventData });
    }
    for (const [expId, expData] of Object.entries(eraData.experiences || {})) {
      for (const [eventId, eventData] of Object.entries(expData.events || {})) {
        allEvents.push({ eraId, expId, eventId, ...eventData });
      }
    }
  }

  allEvents.sort((a, b) => {
    const dateA = a.date || '9999-99-99';
    const dateB = b.date || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = a.time || '12:00:00';
    const timeB = b.time || '12:00:00';
    return timeA.localeCompare(timeB);
  });

  for (const evt of allEvents) {
    if (evt.eventIsRest) {
      spentInCurrentCycle = 0;
      continue;
    }

    if (!evt.eventIsSpan) continue;

    // TTL: Parse departure and arrival via TTL (not new Date())
    const fromMs = parseDateToObjectiveMs(
      evt.eventSpanFromDate || evt.date,
      evt.eventSpanFromTime || evt.time || '12:00:00'
    );
    const toMs = parseDateToObjectiveMs(
      evt.eventSpanToDate,
      evt.eventSpanToTime || '12:00:00'
    );

    if (!fromMs || !toMs) continue;

    // KERNEL: Span cost via computeSpanCost
    const spanDurationSeconds = computeSpanCost({ ts: fromMs, arrivalTs: toMs });

    if (spanDurationSeconds > 0 && (spentInCurrentCycle + spanDurationSeconds) > maxPool) {
      restCount++;
      const SECONDS_IN_DAY = 86400;

      let restStartSec = fromMs / 1000 - SECONDS_IN_DAY;
      let restEndSec = fromMs / 1000;

      // TTL: Parse DOB safely
      if (dob) {
        const dobMs = parseDateToObjectiveMs(dob);
        const dobSec = dobMs / 1000;
        if (restStartSec < dobSec) {
          restStartSec = dobSec;
          restEndSec = dobSec + SECONDS_IN_DAY;
        }
      }

      // TTL: Format rest dates via formatObjectiveTime (UTC-safe)
      const restStartResult = formatObjectiveTime(restStartSec * 1000);
      const restEndResult = formatObjectiveTime(restEndSec * 1000);

      const restStartEvent = {
        id: rid(),
        eventTitle: restCount === 1 ? 'Recovered After Spanning' : `Recovery Period ${restCount}`,
        eventNotes: 'Span pool exhausted. 24-hour recovery before next span.',
        date: restStartResult.date,
        time: restStartResult.time,
        location: evt.eventSpanFromLocation || evt.location || '',
        lat: evt.eventSpanFromLat || null,
        lng: evt.eventSpanFromLng || null,
        zoom: 12,
        eventIsSpan: false,
        eventIsRest: true,
        sort: (evt.sort || 500) - 50,
        createdAt: Date.now(),
        age: evt.age || 0
      };

      const restEndEvent = {
        id: rid(),
        eventTitle: 'End of Rest',
        eventNotes: 'Rest complete. Span pool refilled.',
        date: restEndResult.date,
        time: restEndResult.time,
        location: evt.eventSpanFromLocation || evt.location || '',
        lat: evt.eventSpanFromLat || null,
        lng: evt.eventSpanFromLng || null,
        zoom: 12,
        eventIsSpan: false,
        eventIsRest: false,
        isRestEnd: true,
        sort: (evt.sort || 500) - 10,
        createdAt: Date.now(),
        age: evt.age || 0
      };

      const eraId = evt.eraId;
      const expId = evt.expId;

      if (expId && processedEras[eraId]?.experiences?.[expId]) {
        processedEras[eraId].experiences[expId].events[restStartEvent.id] = restStartEvent;
        processedEras[eraId].experiences[expId].events[restEndEvent.id] = restEndEvent;
      } else if (processedEras[eraId]?.events) {
        processedEras[eraId].events[restStartEvent.id] = restStartEvent;
        processedEras[eraId].events[restEndEvent.id] = restEndEvent;
      }

      spentInCurrentCycle = 0;
    }

    spentInCurrentCycle += spanDurationSeconds;
  }

  return processedEras;
}

export function buildLifeline(foundryJson, geoMap, wizardData, addLog) {
  const eras = buildEras(foundryJson, wizardData);

  if (addLog) {
    const eraCount = Object.keys(eras).length;
    addLog(game.i18n.format("CONTINUUM.NpcGeneratorUI.LifelineBuilt", {events: 0, experiences: 0, eras: eraCount}));
  }

  const lifelineWithEvents = buildEvents(foundryJson, wizardData, eras, geoMap, addLog);

  if (wizardData.spanRank && wizardData.spanRank > 0) {
    enforceSpanPool(lifelineWithEvents, wizardData.spanRank, wizardData.dob);
    const restCount = Object.values(lifelineWithEvents).reduce((sum, era) => {
      return sum + Object.values(era.events || {}).filter(e => e.eventIsRest).length;
    }, 0);
    if (addLog && restCount > 0) addLog(game.i18n.format("CONTINUUM.NpcGeneratorUI.AppliedSpanPoolLimits", {count: restCount}));
  }

  // createdAt reset removed: the spreadsheet now sorts by subjective age (event.eventAge),
  // not by createdAt. Events are ordered by their position in the character's
  // life, not by when this record was created.

  const eventCount = Object.values(lifelineWithEvents).reduce((sum, era) => {
    return sum + Object.keys(era.events || {}).length + Object.values(era.experiences || {}).reduce((s, exp) => s + Object.keys(exp.events || {}).length, 0);
  }, 0);

  const expCount = Object.values(lifelineWithEvents).reduce((sum, era) => sum + Object.keys(era.experiences || {}).length, 0);

  if (addLog) addLog(game.i18n.format("CONTINUUM.NpcGeneratorUI.LifelineBuilt", {events: eventCount, experiences: expCount, eras: Object.keys(lifelineWithEvents).length}));

  return lifelineWithEvents;
}

export function extractLocations(foundryJson, wizardData) {
  const locations = new Set();

  if (wizardData?.birthLocation) {
    locations.add(wizardData.birthLocation);
  }

  if (wizardData?.dob) {
  }

  if (foundryJson?.personal?.birthLocation) {
    locations.add(foundryJson.personal.birthLocation);
  }

  if (foundryJson?.lifelineEvents && Array.isArray(foundryJson.lifelineEvents)) {
    for (const evt of foundryJson.lifelineEvents) {
      if (evt.location) locations.add(evt.location);
      if (evt.eventSpanFromLocation) locations.add(evt.eventSpanFromLocation);
      if (evt.eventSpanToLocation) locations.add(evt.eventSpanToLocation);
    }
  }

if (foundryJson?.experiences) {
    const exps = Array.isArray(foundryJson.experiences) ? foundryJson.experiences : Object.values(foundryJson.experiences);
    for (const exp of exps) {
      if (exp?.location) locations.add(exp.location);
      if (exp?.events && Array.isArray(exp.events)) {
        for (const evt of exp.events) {
          if (evt.location) locations.add(evt.location);
          if (evt.eventSpanFromLocation) locations.add(evt.eventSpanFromLocation);
          if (evt.eventSpanToLocation) locations.add(evt.eventSpanToLocation);
        }
      }
    }
  }

  if (foundryJson?.events && Array.isArray(foundryJson.events)) {
    for (const evt of foundryJson.events) {
      if (evt.location) locations.add(evt.location);
      if (evt.eventSpanFromLocation) locations.add(evt.eventSpanFromLocation);
      if (evt.eventSpanToLocation) locations.add(evt.eventSpanToLocation);
    }
  }

  return [...locations];
}
