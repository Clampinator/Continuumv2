/*
Vehicle catalog - static data for space combat vehicles.
Defines system blocks, propellant capacity, ISP, crew stations.
Land/Air/Water vehicles use the existing ITEM_DATA in item-data.js.
This catalog covers the space domain vehicles specified in the spec.
*/

export const SPACE_VEHICLE_DATA = {
  'Shuttle': {
    mass: 50,
    propellant: 200,
    isp: 450,
    maxAccel: 2,
    armor: 3,
    structureIp: 30,
    crew: { pilot: 1, gunner: 0, engineer: 0, ew: 0, medic: 0 },
    systems: {
      bridge:    { structureIp: 5, function: 10 },
      hullFore:  { structureIp: 5, function: 10 },
      hullPort:  { structureIp: 4, function: 10 },
      magazine:  { structureIp: 3, function: 10 },
      sensors:   { structureIp: 3, function: 10 },
      engines:   { structureIp: 5, function: 10 },
      hullAft:   { structureIp: 5, function: 10 }
    },
    weapons: [],
    description: 'Light orbital shuttle'
  },
  'Corvette': {
    mass: 500,
    propellant: 2000,
    isp: 600,
    maxAccel: 4,
    armor: 6,
    structureIp: 80,
    crew: { pilot: 1, gunner: 1, engineer: 1, ew: 0, medic: 0 },
    systems: {
      bridge:    { structureIp: 10, function: 10 },
      hullFore:  { structureIp: 12, function: 10 },
      hullPort:  { structureIp: 10, function: 10 },
      magazine:  { structureIp: 8,  function: 10 },
      sensors:   { structureIp: 8,  function: 10 },
      engines:   { structureIp: 16, function: 10 },
      hullAft:   { structureIp: 16, function: 10 }
    },
    weapons: [{ name: 'Railgun', damage: 8, arc: 'forward', range: 500 }],
    description: 'Fast escort vessel'
  },
  'Frigate': {
    mass: 2000,
    propellant: 8000,
    isp: 500,
    maxAccel: 2,
    armor: 10,
    structureIp: 200,
    crew: { pilot: 1, gunner: 2, engineer: 2, ew: 1, medic: 1 },
    systems: {
      bridge:    { structureIp: 20, function: 10 },
      hullFore:  { structureIp: 30, function: 10 },
      hullPort:  { structureIp: 25, function: 10 },
      magazine:  { structureIp: 20, function: 10 },
      sensors:   { structureIp: 15, function: 10 },
      engines:   { structureIp: 40, function: 10 },
      hullAft:   { structureIp: 50, function: 10 }
    },
    weapons: [
      { name: 'Main Gun', damage: 12, arc: 'forward', range: 1000 },
      { name: 'Point Defense', damage: 4, arc: 'broadside', range: 200 }
    ],
    description: 'Patrol and escort warship'
  },
  'Destroyer': {
    mass: 5000,
    propellant: 15000,
    isp: 450,
    maxAccel: 1.5,
    armor: 14,
    structureIp: 400,
    crew: { pilot: 1, gunner: 3, engineer: 3, ew: 2, medic: 2 },
    systems: {
      bridge:    { structureIp: 30, function: 10 },
      hullFore:  { structureIp: 50, function: 10 },
      hullPort:  { structureIp: 40, function: 10 },
      magazine:  { structureIp: 30, function: 10 },
      sensors:   { structureIp: 25, function: 10 },
      engines:   { structureIp: 70, function: 10 },
      hullAft:   { structureIp: 85, function: 10 }
    },
    weapons: [
      { name: 'Heavy Railgun', damage: 16, arc: 'forward', range: 2000 },
      { name: 'Missile Array', damage: 10, arc: 'all', range: 3000 },
      { name: 'Point Defense', damage: 4, arc: 'broadside', range: 200 }
    ],
    description: 'Heavy combat vessel'
  }
};