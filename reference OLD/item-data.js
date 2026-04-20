
// This file contains the static data for various items in the Continuum system.
// It's exported so it can be imported and used by the actor sheet.
// Data has been updated and formatted from the provided constants.js to be compatible with the sheet.

const RANGED_WEAPON_RAW_DATA = {
  "none": { ammo: 0, rof: 0, conceal: 0, damageD: 0, damageC: 0, damageB: 0, damageA: 0, damageG: 0, damageF: 0, damageE: 0, weight: 0 },
  "Derringer": { ammo: 2, rof: 1, conceal: -4, damageG: 2, damageF: 3, damageE: 3, damageD: 2, damageC: 2, damageB: 3, damageA: 4, weight: 0.3 },
  "Revolver": { ammo: 6, rof: 1, conceal: -2, damageG: 2, damageF: 3, damageE: 3, damageD: 2, damageC: 4, damageB: 4, damageA: 5, weight: 1.0 },
  "Semi-Auto": { ammo: 15, rof: 2, conceal: -2, damageG: 3, damageF: 3, damageE: 3, damageD: 2, damageC: 4, damageB: 4, damageA: 5, weight: 0.8 },
  "Heavy Pistol": { ammo: 12, rof: 1, conceal: 0, damageG: 3, damageF: 4, damageE: 5, damageD: 4, damageC: 6, damageB: 6, damageA: 8, weight: 1.2 },
  "Hunting Rifle": { ammo: 8, rof: 1, conceal: 6, damageG: 3, damageF: 4, damageE: 5, damageD: 4, damageC: 6, damageB: 7, damageA: 9, weight: 3.5 },
  "Shotgun": { ammo: 8, rof: 1, conceal: 4, damageG: 5, damageF: 5, damageE: 6, damageD: 5, damageC: 7, damageB: 8, damageA: 10, weight: 3.5 },
  "Shotgun (Solid Slugs)": { ammo: 8, rof: 1, conceal: 4, damageG: 7, damageF: 7, damageE: 10, damageD: 8, damageC: 12, damageB: 12, damageA: 20, weight: 3.5 },
  "Assault Rifle": { ammo: 40, rof: 5, conceal: 0, damageG: 5, damageF: 4, damageE: 6, damageD: 4, damageC: 7, damageB: 7, damageA: 9, weight: 3.5 },
  "SMG": { ammo: 30, rof: 3, conceal: 0, damageG: 3, damageF: 3, damageE: 4, damageD: 4, damageC: 4, damageB: 5, damageA: 6, weight: 2.5 },
  "LMG": { ammo: 100, rof: 10, conceal: 4, damageG: 4, damageF: 4, damageE: 5, damageD: 5, damageC: 6, damageB: 7, damageA: 8, weight: 10.0 },
  "HMG": { ammo: 100, rof: 10, conceal: 6, damageG: 5, damageF: 5, damageE: 6, damageD: 6, damageC: 7, damageB: 8, damageA: 10, weight: 35.0 },
  "Taser": { ammo: 2, rof: 1, conceal: -1, damageG: 2, damageF: 2, damageE: 2, damageD: 1, damageC: 2, damageB: 2, damageA: 4, weight: 0.5 },
  "Crossbow": { ammo: 1, rof: 1, conceal: 6, damageG: 3, damageF: 3, damageE: 4, damageD: 3, damageC: 5, damageB: 7, damageA: 7, weight: 2.5 }
};

const MELEE_WEAPON_DATA = {
  "none": { conceal: 0, damage: 0, weight: 0 },
  "Punch": { conceal: -4, damage: 0, weight: 0 },
  "Kick": { conceal: -4, damage: 1, weight: 0 },
  "Knife": { conceal: -4, damage: 1, weight: 0.3 },
  "Sword (Small)": { conceal: -1, damage: 2, weight: 0.8 },
  "Sword (Medium)": { conceal: 1, damage: 3, weight: 1.2 },
  "Sword (Large)": { conceal: 3, damage: 4, weight: 1.8 },
  "Club": { conceal: 1, damage: 1, weight: 1.0 },
  "Staff": { conceal: 5, damage: 1, weight: 1.5 },
  "Spear": { conceal: 6, damage: 3, weight: 2.0 },
  "Polearm": { conceal: 5, damage: 4, weight: 2.5 }
};

const ARMOR_DATA = {
  "none": { encumbrance: 0, ipA: 0, ipB: 0, ipC: 0, ipD: 0, ipE: 0 , ipF: 0 , ipG: 0 },
  "Vest": { encumbrance: 1, ipA: 0, ipB: 2, ipC: 2, ipD: 0, ipE: 0 , ipF: 0 , ipG: 0 },
  "Flak Jacket": { encumbrance: 1, ipA: 0, ipB: 3, ipC: 3, ipD: 3, ipE: 0 , ipF: 0 , ipG: 0 },
  "Light Armor": { encumbrance: 0.5, ipA: 0, ipB: 5, ipC: 3, ipD: 2, ipE: 0 , ipF: 0 , ipG: 0 },
  "Heavy Armor": { encumbrance: 2, ipA: 8, ipB: 8, ipC: 5, ipD: 3, ipE: 0 , ipF: 0 , ipG: 0 },
  "Riot Gear": { encumbrance: 2, ipA: 5, ipB: 5, ipC: 5, ipD: 5, ipE: 4 , ipF: 4 , ipG: 4 },
  "Helmet": { encumbrance: 0.7, ipA: 5, ipB: 0, ipC: 0, ipD: 0, ipE: 0 , ipF: 0 , ipG: 0 }
};

const METABILITY_DATA = {
  coercion: {
    labels: { range: "Range", complexity: "Complexity", duration: "Duration", control: "Control" },
    ranks: {
      1: { range: "Touch", complexity: "Invertebrate", duration: "1 action", control: "Injected Compulsion" },
      2: { range: "1 m", complexity: "Mammals", duration: "3 actions", control: "Subliminal Suggestion" },
      3: { range: "10 m", complexity: "Humans", duration: "1 minute", control: "Projection / Distortion" },
      4: { range: "500 m", complexity: "Multiple Targets", duration: "1 hour", control: "Domination / Possession" },
      5: { range: "10 km", complexity: "Xenocs", duration: "1 day", control: "Subsumption" }
    }
  },
  creativity: {
    labels: { range: "Range", energy: "Energy", ip: "IP/Stage", matter: "Matter", state: "State", complexity: "Complexity", duration: "Duration" },
    ranks: {
      1: { range: "Touch", energy: "100 j", ip: "0", matter: "1 cm³", state: "Solid", complexity: "1 element", duration: "instant" },
      2: { range: "1 m", energy: "1 Kj", ip: "1", matter: "10 cm³", state: "Liquid", complexity: "Alloys & mixtures", duration: "instant" },
      3: { range: "10 m", energy: "1 Mj", ip: "10", matter: "1 m³", state: "Gas", complexity: "Compounds", duration: "1 action" },
      4: { range: "500 m", energy: "1 Gj", ip: "100", matter: "10 m³", state: "Mechanical", complexity: "Single Celled Organics", duration: "3 actions" },
      5: { range: "10 km", energy: "1 Tj", ip: "1000", matter: "100 m³", state: "Chemical", complexity: "Multi-Cellular Organics", duration: "1 minute" }
    }
  },
  farsense: {
    labels: { range: "Range", senses: "Senses", duration: "Duration", sense: "Sense" },
    ranks: {
      1: { range: "10m", senses: "1 sense", duration: "1 action", sense: "Hypersense, Link, Shield" },
      2: { range: "10km", senses: "2 senses", duration: "3 actions", sense: "Aura Reading" },
      3: { range: "1,000km", senses: "3 senses", duration: "1 minute", sense: "Psychometry" },
      4: { range: "1,000,000 km", senses: "4 senses", duration: "1 hour", sense: "Micro/Macro" },
      5: { range: "1ly", senses: "Excorporal Excursion", duration: "1 day", sense: "Prolepsis, EE" }
    }
  },
  pk: {
    labels: { range: "Range", mass: "Mass", duration: "Duration", dexterity: "Dexterity", speed: "Speed" },
    ranks: {
      1: { range: "Touch", mass: "100 grams", duration: "1 action", dexterity: "Mittens", speed: "1 meter ph" },
      2: { range: "1 meter", mass: "10kg", duration: "3 actions", dexterity: "Hands", speed: "1kph" },
      3: { range: "10 meters", mass: "100kg", duration: "1 minute", dexterity: "Precision Tools", speed: "10kph" },
      4: { range: "500 meters", mass: "1 ton", duration: "1 hour", dexterity: "Anything visible", speed: "100kph" },
      5: { range: "10 kms", mass: "100 tons", duration: "1 day", dexterity: "Microscopic", speed: "1000kph" }
    }
  },
  redaction: {
    labels: { range: "Range", complexity: "Complexity (other)", effect: "Effect" },
    ranks: {
      1: { range: "Self", complexity: "Invertebrate", effect: "1 IP / Hour" },
      2: { range: "Touch", complexity: "Mammals", effect: "1 IP / Minute" },
      3: { range: "10 cm", complexity: "Humans", effect: "1 IP / 3 actions" },
      4: { range: "1 m", complexity: "Multiple Targets", effect: "1 IP / action" },
      5: { range: "50 m", complexity: "Xenocs", effect: "10 IP / action" }
    }
  }
};

const LAND_VEHICLE_DATA = {
  "none": { speedBlocks: 0, mass: 0, ip: 0, armor: 0, passengers: 0 },
  "Skateboard": { speedBlocks: 1, mass: 0.0001, ip: 1, armor: 0, passengers: 1 },
  "Bicycle": { speedBlocks: 1, mass: 0.001, ip: 2, armor: 0, passengers: 2 },
  "Moped": { speedBlocks: 2, mass: 0.3, ip: 5, armor: 1, passengers: 2 },
  "Motorcycle": { speedBlocks: 4, mass: 0.5, ip: 6, armor: 1, passengers: 2 },
  "Hog": { speedBlocks: 4, mass: 0.7, ip: 8, armor: 1, passengers: 2 },
  "Compact car": { speedBlocks: 3, mass: 1.3, ip: 13, armor: 3, passengers: 4 },
  "Medium Car": { speedBlocks: 4, mass: 1.5, ip: 15, armor: 3, passengers: 5 },
  "Large SUV": { speedBlocks: 3, mass: 2.4, ip: 24, armor: 4, passengers: 6 },
  "Race Car": { speedBlocks: 5, mass: 1.5, ip: 10, armor: 3, passengers: 2 },
  "Van": { speedBlocks: 3, mass: 6, ip: 30, armor: 3, passengers: 8 },
  "Small Truck": { speedBlocks: 3, mass: 12, ip: 40, armor: 2, passengers: 16 },
  "Truck": { speedBlocks: 3, mass: 25, ip: 60, armor: 4, passengers: 30 },
  "Bus": { speedBlocks: 3, mass: 17, ip: 50, armor: 4, passengers: 50 }
};

const AIR_VEHICLE_DATA = {
  "none": { speedBlocks: 0, mass: 0, ip: 0, armor: 0, passengers: 0 },
  "Jumbo Passenger Jet": { speedBlocks: 4, mass: 400, ip: 150, armor: 5, passengers: 450 },
  "Mid-Size Passenger Jet": { speedBlocks: 4, mass: 80, ip: 100, armor: 4, passengers: 180 },
  "Light Passenger Jet": { speedBlocks: 4, mass: 40, ip: 80, armor: 3, passengers: 90 },
  "Passenger Turboprop": { speedBlocks: 3, mass: 20, ip: 60, armor: 3, passengers: 70 },
  "Cargo Plane": { speedBlocks: 3, mass: 250, ip: 120, armor: 6, passengers: 10 },
  "Very Light Jet": { speedBlocks: 5, mass: 4, ip: 30, armor: 2, passengers: 6 },
  "Business Jet": { speedBlocks: 5, mass: 15, ip: 50, armor: 3, passengers: 12 },
  "Military Jet": { speedBlocks: 5, mass: 20, ip: 80, armor: 8, passengers: 2 },
  "Private Single-Engine": { speedBlocks: 3, mass: 1.5, ip: 15, armor: 1, passengers: 4 },
  "Twin Turboprop": { speedBlocks: 3, mass: 5, ip: 25, border: 2, passengers: 8 },
  "Aerobatic Plane": { speedBlocks: 4, mass: 1, ip: 10, armor: 1, passengers: 2 },
  "Amphibious Plane": { speedBlocks: 3, mass: 3, ip: 20, armor: 2, passengers: 6 }
};

const WATER_VEHICLE_DATA = {
  "none": { speedBlocks: 0, mass: 0, ip: 0, armor: 0, passengers: 0 },
  "Personal Watercraft": { speedBlocks: 3, mass: 0.4, ip: 4, armor: 0, passengers: 2 },
  "Small Fishing Boat": { speedBlocks: 2, mass: 2, ip: 10, armor: 1, passengers: 4 },
  "Speedboat": { speedBlocks: 4, mass: 3, ip: 15, armor: 1, passengers: 6 },
  "Yacht": { speedBlocks: 3, mass: 50, ip: 80, armor: 3, passengers: 12 },
  "Ferry": { speedBlocks: 2, mass: 500, ip: 200, armor: 5, passengers: 200 },
  "Container Ship": { speedBlocks: 1, mass: 100000, ip: 500, armor: 8, passengers: 20 },
  "Naval Patrol Boat": { speedBlocks: 4, mass: 400, ip: 150, armor: 10, passengers: 30 },
  "Submarine": { speedBlocks: 2, mass: 8000, ip: 300, armor: 15, passengers: 140 }
};

const ALL_VEHICLE_DATA = {
  "Land Vehicles": LAND_VEHICLE_DATA,
  "Air Vehicles": AIR_VEHICLE_DATA,
  "Water Vehicles": WATER_VEHICLE_DATA
};

const SPEED_PENALTIES = [0, -3, -6, -9, -15];

export const ITEM_DATA = {
  rangedWeapons: RANGED_WEAPON_RAW_DATA,
  meleeWeapons: MELEE_WEAPON_DATA,
  armor: ARMOR_DATA,
  metabilities: METABILITY_DATA,
  vehicles: LAND_VEHICLE_DATA, 
  airVehicles: AIR_VEHICLE_DATA,
  waterVehicles: WATER_VEHICLE_DATA,
  allVehicleData: ALL_VEHICLE_DATA, // For sheet template dropdowns
  speedPenalties: SPEED_PENALTIES
};
