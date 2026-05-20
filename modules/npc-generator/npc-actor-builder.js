import { REGION_CULTURE_MAP } from './npc-state.js';
import { buildLifeline, extractLocations } from './npc-lifeline-builder.js';
import { geocodeLocations } from './npc-geocoder.js';

function getCultureLabel(region, culture) {
  if (!region || !culture) return culture || region || '';
  const cultures = REGION_CULTURE_MAP[region];
  if (cultures) {
    const match = cultures.find(c => c.value === culture);
    if (match) return match.label;
  }
  return culture;
}

export async function buildActorFromAIResponse(aiResponse, wizardData, addLog) {
  const { name, narrative, secret, imagePrompt, foundryJson } = aiResponse;

  const actorName = wizardData.name || name || 'Unnamed NPC';

  const npcType = wizardData.npcType || 'Leveler';
  const isLeveler = npcType === 'Leveler';
  const isSpanner = !isLeveler;
  const isOperant = wizardData.isOperant || npcType === 'Mentor';
  const fraternity = isLeveler ? '' : (wizardData.fraternity || foundryJson?.personal?.fraternity || '');
  const spanRank = isLeveler ? 0 : (wizardData.spanRank || 1);

  const birthLocation = wizardData.birthLocation || foundryJson?.personal?.birthLocation || '';
  const dob = wizardData.dob || foundryJson?.personal?.dob || '';

  const SECONDS_IN_YEAR = 31536000;
  const currentYear = new Date().getFullYear();
  const birthYear = dob ? parseInt(dob.split('-')[0]) : currentYear - 30;
  const approximateAgeYears = Math.max(18, currentYear - birthYear);
  const subjectiveNow = approximateAgeYears * SECONDS_IN_YEAR;

  const actorData = {
    name: actorName,
    type: 'character',
    img: 'icons/svg/mystery-man.svg',
    system: {
      personal: {
        name: actorName,
        pronouns: wizardData.pronouns || foundryJson?.personal?.pronouns || '',
        heritage: getCultureLabel(wizardData.region, wizardData.culture),
        era: wizardData.era || foundryJson?.personal?.era || '',
        fraternity: fraternity,
        grace: foundryJson?.personal?.grace || '',
        invitationDate: isLeveler ? '' : (foundryJson?.personal?.invitationDate || ''),
        locality: foundryJson?.personal?.locality || '',
        dob: dob,
        birthLocation: birthLocation,
        birthLat: null,
        birthLng: null,
        subjectiveNow: subjectiveNow
      },
      attributes: buildAttributes(wizardData),
      background: narrative || foundryJson?.background || '',
      metabilities: buildMetabilities(wizardData, isOperant),
      spanning: {
        span: spanRank,
        naturalSpan: 0,
        deliberateFrag: 0,
        naturalFrag: 0,
        skills: {},
        abilities: {}
      },
      eras: {},
      benefits: {},
      combat: {
        rangedWeapons: {},
        meleeWeapons: {},
        armor: {},
        wounds: {
          '0': { ip: 0, type: '', bleeding: false },
          '1': { ip: 0, type: '', bleeding: false },
          '2': { ip: 0, type: '', bleeding: false },
          '3': { ip: 0, type: '', bleeding: false },
          '4': { ip: 0, type: '', bleeding: false }
        },
        stuff: '',
        assets: ''
      },
      goals: {},
      theYet: {},
      favors: buildFavors(foundryJson?.favors),
      relationships: buildRelationships(foundryJson?.relationships, wizardData),
      vehicles: {},
      airVehicles: {},
      waterVehicles: {},
      network: {},
      networkEdges: {}
    }
  };

  if (wizardData.portraitPath) {
    actorData.img = wizardData.portraitPath;
  }

  const actor = await Actor.create(actorData);

  if (!actor) return { actor: null, foundryJson };

  if (secret) {
    await actor.update({ 'system.eventNotes': secret });
  }

  return { actor, foundryJson };
}

export async function enrichActorLifeline(actor, foundryJson, wizardData, addLog) {
  if (!foundryJson) {
    if (addLog) addLog('No foundryJson data - skipping lifeline enrichment.');
    return;
  }

  const locations = extractLocations(foundryJson, wizardData);
  if (addLog) addLog(`Found ${locations.length} locations to geocode...`);

  let geoMap = new Map();
  if (locations.length > 0) {
    geoMap = await geocodeLocations(locations, addLog);
  }

  if (addLog) addLog('Building lifeline...');

  const lifeline = buildLifeline(foundryJson, geoMap, wizardData, addLog);

  const lifelineEraCount = Object.keys(lifeline).length;
  const lifelineEventCount = Object.values(lifeline).reduce((sum, era) =>
    sum + Object.keys(era.events || {}).length + Object.values(era.experiences || {}).reduce((s, exp) =>
      s + Object.keys(exp.events || {}).length, 0), 0);
  const lifelineExpCount = Object.values(lifeline).reduce((sum, era) => sum + Object.keys(era.experiences || {}).length, 0);
  if (addLog) addLog(`Lifeline result: ${lifelineEraCount} eras, ${lifelineEventCount} events, ${lifelineExpCount} experiences`);

  const updateData = { 'system.eras': lifeline };

  const birthLoc = wizardData.birthLocation || foundryJson?.personal?.birthLocation;
  if (birthLoc) {
    const birthGeo = geoMap.get(birthLoc) || geoMap.get(birthLoc.toLowerCase());
    if (birthGeo && birthGeo.lat !== null) {
      updateData['system.personal.birthLat'] = birthGeo.lat;
      updateData['system.personal.birthLng'] = birthGeo.lng;
    }
  }

  // Suppress the blur-triggered rebuild during this programmatic update.
  // actor.update() causes the spreadsheet to re-render; if a date/time field
  // was focused it fires blur -> rebuildFromSpreadsheet, which wipes the
  // AI-provided ages and floods Nominatim with parallel geocoding requests.
  const openSpreadsheets = Object.values(ui.windows || {}).filter(w =>
    w.constructor?.name === 'LifelineSpreadsheetApp' && w.actor?.id === actor.id
  );
  for (const w of openSpreadsheets) w._suppressRebuild = true;

  await actor.update(updateData);

  setTimeout(() => { for (const w of openSpreadsheets) w._suppressRebuild = false; }, 300);

  if (actor.sheet?.rendered) {
    await actor.sheet.render(true);
  }

  return actor;
}

export async function linkToPC(npcActor, pcActor, relationshipType) {
  if (!npcActor || !pcActor) return;

  const relId = foundry.utils.randomID();
  const relationshipTypes = [
    'Sibling', 'Parent', 'Friend', 'Colleague', 'Mentor',
    'Student', 'Rival', 'Superior', 'Subordinate', 'Acquaintance', 'Spouse'
  ];
  const type = relationshipType || 'Acquaintance';

  const npcRelId = foundry.utils.randomID();
  await npcActor.update({
    [`system.relationships.${npcRelId}`]: {
      id: npcRelId,
      name: pcActor.name,
      relationshipType: type,
      importance: 'Personal',
      when: '',
      where: '',
      eventNotes: `Connected to ${pcActor.name}`
    }
  });

  const pcRelId = foundry.utils.randomID();
  const inverseTypes = {
    'Mentor': 'Student', 'Student': 'Mentor',
    'Superior': 'Subordinate', 'Subordinate': 'Superior',
    'Parent': 'Sibling', 'Spouse': 'Spouse',
    'Friend': 'Friend', 'Rival': 'Rival',
    'Colleague': 'Colleague', 'Acquaintance': 'Acquaintance',
    'Sibling': 'Sibling'
  };
  const inverseType = inverseTypes[type] || 'Acquaintance';
  await pcActor.update({
    [`system.relationships.${pcRelId}`]: {
      id: pcRelId,
      name: npcActor.name,
      relationshipType: inverseType,
      importance: 'Personal',
      when: '',
      where: '',
      eventNotes: `Connected to ${npcActor.name} via NPC generator`
    }
  });

  const npcNodeId = foundry.utils.randomID();
  const pcRootId = Object.keys(pcActor.system.network || {})[0];
  if (!pcRootId) return;

  await npcActor.update({
    [`system.network.${npcNodeId}`]: {
      id: npcNodeId,
      name: pcActor.name,
      actorId: pcActor.id,
      relationshipType: inverseType,
      importance: 'Personal',
      groups: [],
      favor: '',
      eventNotes: '',
      dateFrom: '',
      dateTo: '',
      x: 0,
      y: 0
    }
  });

  const pcNodeId = foundry.utils.randomID();
  await pcActor.update({
    [`system.network.${pcNodeId}`]: {
      id: pcNodeId,
      name: npcActor.name,
      actorId: npcActor.id,
      relationshipType: type,
      importance: 'Personal',
      groups: [],
      favor: '',
      eventNotes: '',
      dateFrom: '',
      dateTo: '',
      x: 100,
      y: 100
    }
  });

  const edgeId = foundry.utils.randomID();
  await pcActor.update({
    [`system.networkEdges.${edgeId}`]: {
      id: edgeId,
      source: pcRootId,
      target: pcNodeId,
      relationshipType: type,
      importance: 'Personal',
      eventNotes: '',
      dateFrom: '',
      dateTo: '',
      strength: 3
    }
  });
}

function buildAttributes(wizardData) {
  const { attributePreset, customAttributes } = wizardData;

  const presets = {
    balanced: { body: 4, mind: 4, eq: 4, quick: 4 },
    physical: { body: 6, mind: 3, eq: 3, quick: 5 },
    intellectual: { body: 3, mind: 6, eq: 5, quick: 3 },
    social: { body: 3, mind: 5, eq: 6, quick: 4 }
  };

  const attrs = attributePreset === 'custom' ? customAttributes : (presets[attributePreset] || presets.balanced);

  return {
    body: { value: attrs.body },
    mind: { value: attrs.mind },
    eq: { value: attrs.eq },
    quick: { value: attrs.quick },
    willpower: { temp: 5, perm: 5 }
  };
}

function buildMetabilities(wizardData, isOperant) {
  const { metabilities } = wizardData;

  return {
    latent: { value: isOperant ? 0 : 1 },
    coercion: { value: metabilities.coercion || 0, potential: metabilities.coercion || 0 },
    creativity: { value: metabilities.creativity || 0, potential: metabilities.creativity || 0 },
    farsense: { value: metabilities.farsense || 0, potential: metabilities.farsense || 0 },
    pk: { value: metabilities.pk || 0, potential: metabilities.pk || 0 },
    redaction: { value: metabilities.redaction || 0, potential: metabilities.redaction || 0 },
    applications: {},
    potentialsLocked: false
  };
}

function buildRelationships(aiRelationships, wizardData) {
  const rels = {};
  if (!aiRelationships || typeof aiRelationships !== 'object') return rels;

  const typeMap = {
    'friend': 'Friend', 'rival': 'Rival', 'mentor': 'Mentor',
    'family': 'Sibling', 'colleague': 'Colleague', 'superior': 'Superior',
    'subordinate': 'Subordinate', 'acquaintance': 'Acquaintance',
    'spouse': 'Spouse', 'student': 'Student', 'parent': 'Parent'
  };

  for (const [, relData] of Object.entries(aiRelationships)) {
    if (!relData || !relData.name) continue;
    const id = foundry.utils.randomID();
    const mappedType = typeMap[relData.type?.toLowerCase()] || typeMap[relData.relationshipType?.toLowerCase()] || 'Acquaintance';
    rels[id] = {
      id: id,
      name: relData.name,
      relationshipType: mappedType,
      importance: 'Social',
      when: relData.when || '',
      where: relData.where || '',
      eventNotes: relData.eventNotes || ''
    };
  }

  return rels;
}

function buildFavors(aiFavors) {
  const favors = {};
  if (!aiFavors || typeof aiFavors !== 'object') return favors;

  for (const [, favData] of Object.entries(aiFavors)) {
    if (!favData || !favData.name) continue;
    const id = foundry.utils.randomID();
    favors[id] = {
      id: id,
      name: favData.name,
      description: favData.eventNotes || favData.description || '',
      importance: favData.importance || 'Important',
      when: favData.when || '',
      createdAt: Date.now()
    };
  }

  return favors;
}
