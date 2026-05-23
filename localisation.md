# Continuum V2 - Internationalization (i18n) Plan

> **Status**: In Progress  
> **Last Updated**: 2026-05-23  
> **Session 8 Completed**: 2026-05-23
> **Session 9 Completed**: 2026-05-23
> **Session 10 Completed**: 2026-05-23
> **Purpose**: Systematic guide for replacing all hardcoded English strings with Foundry localization calls.

---

## How to Use This Document

Each **Session** is a self-contained unit of work. To execute a session:

1. Read the session's "Files to Edit" list
2. Add any new keys to `lang/en.json` (see Key Structure below)
3. Replace hardcoded strings:
   - In **Handlebars templates**: `{{localize "CONTINUUM.Key"}}` or `{{localize "CONTINUUM.Key" var=value}}`
   - In **JavaScript files**: `game.i18n.localize("CONTINUUM.Key")` or `game.i18n.format("CONTINUUM.Key", {var: value})`
4. Run `npm test` to verify nothing breaks
5. Commit when done

### Exclusions (DO NOT localize)

- **Game lore terms**: Fraternity names (Antequarians, Foxhorn, etc.), Era names (Aquarian, Piscean, etc.)
- **Game-mechanical select values**: Goal importance (Passing, Mild, Important, etc.), relationship types (Sibling, Parent, etc.), favor importance levels
- **Damage grade letters**: G, F, E, D, C, B, A
- **Stat abbreviations in gear**: Spd, Cap, Con, Hnd, Acc, Prs
- **Data variable interpolations**: Anything already in `{{...}}` that outputs data, not labels
- **CSS class names, HTML attribute values used functionally** (not displayed to user)

### Key Naming Convention

- Nested dot-notation: `CONTINUUM.{Section}.{Key}`
- Use UpperCamelCase for keys: `CONTINUUM.Personal.BirthLocation`
- Group by UI section/feature, not by file
- Keys that are reused across multiple contexts should live in a shared group (e.g., `CONTINUUM.Common.From`, `CONTINUUM.Common.To`)

---

## Master Key Structure for `lang/en.json`

All keys that need to exist. Already-existing keys are marked with [E]. New keys are unmarked.

```json
{
  "CONTINUUM": {
    "SystemName": "Continuum: Roleplaying in the Yet",
    "SheetLabels": {
      "Character": "Character Sheet",       [E]
      "Organization": "Organization Sheet", [E]
      "Location": "Location Sheet",          [E]
      "Item": "Item Sheet"
    },
    "Tabs": {
      "Main": "Main",                       [E]
      "Personal": "Personal",
      "Attributes": "Attributes",           [E]
      "Background": "Background",
      "Spanning": "Spanning",               [E]
      "Metabilities": "Metabilities",
      "TheYet": "The Yet",                  [E]
      "Goals": "Goals",                     [E]
      "Experiences": "Experiences",          [E]
      "Combat": "Combat",                   [E]
      "Favors": "Favors",                   [E]
      "Relationships": "Relationships",      [E]
      "Gear": "Gear",
      "Vehicles": "Vehicles"
    },
    "Common": {
      "From": "From:",
      "To": "To:",
      "Date": "Date",
      "Time": "Time",
      "Location": "Location",
      "Era": "Era",
      "Age": "Age",
      "Name": "Name",
      "Description": "Description",
      "Notes": "Notes",
      "Cancel": "Cancel",
      "Add": "Add",
      "Delete": "Delete",
      "Edit": "Edit",
      "Save": "Save",
      "Help": "Help",
      "SearchPlaceholder": "Search...",
      "SelectDots": "Select...",
      "None": "None",
      "Yrs": "Yrs",
      "Days": "Days",
      "Locate": "Locate",
      "GrabCenter": "Grab Center",
      "CaptureToken": "Capture Token Location",
      "CannotDeleteWithContent": "Cannot delete an element with content",
      "DragToReorder": "Drag to reorder"
    },
    "Personal": {
      "Title": "Personal Information",
      "Description": "Description",
      "Name": "Name:",
      "Identity": "Identity:",
      "Heritage": "Heritage:",
      "HeightCm": "Height:",
      "WeightKg": "Weight:",
      "Appearance": "Appearance:",
      "AppearancePlaceholder": "Apparent age or visual description",
      "Dob": "Date of Birth:",
      "BirthLocation": "Birthplace:",
      "BirthLocationPlaceholder": "City, Country",
      "Locality": "Locality:",
      "Society": "Society:",
      "Grace": "Grace:",
      "DateOfInvitation": "Date of Invitation:",
      "Corner": "Corner:",
      "Fraternity": "Fraternity:",
      "Era": "Era:",
      "CalculatedAge": "Calculated automatically from the Lifeline",
      "LocateOnMap": "Locate on Map",
      "GrabMapCenter": "Grab Map Center",
      "SheetSettings": "Sheet Settings"
    },
    "Attributes": {
      "Title": "Attributes",               [E]
      "Body": "Force",
      "Mind": "Analyze",
      "EQ": "Relate",
      "Quick": "React",
      "Willpower": "Willpower",            [E]
      "Temp": "Temp",                      [E]
      "Perm": "Perm",                      [E]
      "Force": "Force",
      "Analyze": "Analyze",
      "Relate": "Relate",
      "React": "React",
      "TempWillLabel": "Temp Will",
      "PermWillLabel": "Perm Will",
      "RollForce": "Roll Force",
      "RollAnalyze": "Roll Analyze",
      "RollRelate": "Roll Relate",
      "RollReact": "Roll React",
      "RollTempWill": "Roll Temp Will",
      "RollPermWill": "Roll Perm Will",
      "Benefits": "Benefits",
      "SetTokenImage": "Set Token Image"
    },
    "Background": {
      "Title": "Background & Gear",
      "Stuff": "Stuff",
      "Assets": "Assets:",
      "Gear": "Gear",
      "Carried": "Carried",
      "Limit": "Limit",
      "Item": "Item",
      "Bonus": "Bonus",
      "Aspects": "Aspects",
      "Quantity": "Qty",
      "Weight": "Wt",
      "Class": "Class",
      "Firearms": "Firearms",
      "Technology": "Technology",
      "Tools": "Tools",
      "VehicleClass": "Vehicles",
      "DragFirearm": "Drag a Firearm item from the sidebar to add it.",
      "DragTechnology": "Drag a Technology item from the sidebar to add it.",
      "DragTool": "Drag a Tool item from the sidebar to add it.",
      "DragVehicle": "Drag a Vehicle item from the sidebar to add it.",
      "Use": "Use",
      "EditItem": "Edit Item",
      "DeleteItem": "Delete Item",
      "Speed": "Speed",
      "Capacity": "Capacity",
      "Connectivity": "Connectivity",
      "Quality": "Quality",
      "Versatility": "Versatility",
      "Durability": "Durability",
      "Handling": "Handling",
      "Acceleration": "Acceleration",
      "Prestige": "Prestige",
      "Air": "Air",
      "Water": "Water",
      "Land": "Land",
      "GearHelp": "Gear Help",
      "BackgroundPlaceholder": "Write your character's background...",
      "StuffPlaceholder": "List equipment, contacts, notes, etc."
    },
    "Goals": {
      "Title": "Goals",
      "AddGoal": "Add Goal",
      "IWill": "I will...",
      "By": "by...",
      "AchievePlaceholder": "...achieve something great.",
      "CompletePlaceholder": "...completing this task.",
      "Importance": "Importance...",
      "Passing": "Passing",
      "Mild": "Mild",
      "Important": "Important",
      "Extreme": "Extreme",
      "Critical": "Critical",
      "Resolved": "Resolved",
      "DeleteGoal": "Delete Goal"
    },
    "Spanning": {
      "Title": "Spanning",                   [E]
      "Span": "Span",                        [E]
      "NaturalSpan": "Natural Span",         [E]
      "DeliberateFrag": "Delib Frag",
      "NaturalFrag": "Nat Frag",
      "AvailableSpan": "Available Span:",
      "Calculate": "Calculate",
      "Ability": "Ability",
      "AbilityPlaceholder": "Ability Name",
      "AbilityDescriptionPlaceholder": "Describe ability...",
      "NatSpanAbility": "Natural Span Ability",
      "NatSpanAbilityPlaceholder": "Natural Span Ability Name",
      "NatSpanDescriptionPlaceholder": "Describe ability...",
      "AddAbility": "Add Ability",
      "AddNatSpanAbility": "Add Natural Span Ability",
      "CannotSpanLeveller": "Cannot Span: Leveller (Span 0)",
      "CannotSpanOverburdened": "Cannot Span: Overburdened",
      "RollSpan": "Roll Span",
      "RollNaturalSpan": "Roll Natural Span",
      "DeleteAbility": "Delete Ability",
      "DeleteNatSpanAbility": "Delete Natural Span Ability",
      "AbilityProficiency": "Ability proficiency (0-3)",
      "RecalculateSpan": "Recalculate Span"
    },
    "Metabilities": {
      "Title": "Metabilites",
      "Coercion": "Coercion",
      "Creativity": "Creativity",
      "Farsense": "Farsense",
      "PK": "PK",
      "Redaction": "Redaction",
      "Coerce": "Coerce",
      "Create": "Create",
      "Farsense": "Farsense",
      "Shift": "Shift",
      "Redact": "Redact",
      "Application": "Application",
      "AddApplication": "Add Application",
      "Running": "Running",
      "RunningTooltip": "Running in background (-1 to Analyze rolls)",
      "Level": "Lvl",
      "LevelTooltip": "Application Level (1-3)",
      "ApplicationNamePlaceholder": "Name",
      "ApplicationDescriptionPlaceholder": "Describe application...",
      "RollApplication": "Roll this Application",
      "DeleteApplication": "Delete Application",
      "DragToSetPotential": "Drag to set Operant Potential",
      "OperantPotential": "Operant Potential"
    },
    "Experiences": {
      "Title": "Eras & Experiences",
      "SearchPlaceholder": "Search Eras, Experiences & Events...",
      "OldestFirst": "Oldest First",
      "NewestFirst": "Newest First",
      "AddEra": "Add Era",
      "AddYet": "Add Yet",
      "AddExperience": "Experience",
      "AddEvent": "Event",
      "EraNamePlaceholder": "Era Name (e.g., Childhood, The War Years)",
      "From": "From:",
      "To": "To:",
      "StartDateLocked": "Start Date is locked to previous Age or Birth",
      "ExperienceTitle": "Experience",
      "EventTitle": "Event",
      "NotesPlaceholder": "Notes",
      "DescriptionPlaceholder": "Experience notes",
      "Spent": "Spent",
      "Remaining": "Remaining",
      "SpanUp": "Span Up",
      "SpanLevel": "Span Level",
      "SpanDown": "Span Down",
      "LocationFrom": "Location From",
      "LocationTo": "Location To",
      "ToggleSpan": "Toggle Span Event",
      "ToggleTrauma": "Toggle Trauma",
      "ToggleRest": "Toggle 24h Rest Event",
      "LinkKeyframe": "Link to Keyframe",
      "UnlinkKeyframe": "Unlink Keyframe",
      "SpacetimeLink": "Spacetime Link",
      "LinkedToSpacetimeKeyframe": "Linked to Spacetime Keyframe",
      "DeleteEra": "Delete Era",
      "DeleteExperience": "Delete Experience",
      "DeleteEvent": "Delete Event",
      "MinimizeMaximize": "Minimize/Maximize"
    },
    "Combat": {
      "Title": "Combat",                        [E]
      "RangedWeapons": "Ranged Weapons",        [E]
      "MeleeWeapons": "Melee Weapons",          [E]
      "Armor": "Armor",                         [E]
      "Wounds": "Wounds",                        [E]
      "IP": "IP",                                [E]
      "Bleeding": "Bleeding",                    [E]
      "ActionPoints": "Action Points",           [E]
      "CustomFirearms": "Custom Firearms",
      "Weapon": "Weapon",
      "ArmorType": "Armor Type",
      "Carried": "Carried",
      "Attack": "Attack",
      "Bonus": "Bonus",
      "Ammo": "Ammo",
      "RoF": "RoF",
      "Concealment": "Conc.",
      "Encumbrance": "Enc.",
      "Damage": "Dmg.",
      "TotalEncumbrance": "Total Encumbrance:",
      "ForceAttribute": "Force Attribute:",
      "MovePenalty": "Move Penalty:",
      "AddRangedWeapon": "Add Ranged Weapon",
      "AddMeleeWeapon": "Add Melee Weapon",
      "AddArmor": "Add Armor",
      "DeleteWeapon": "Delete Weapon",
      "DeleteArmor": "Delete Armor",
      "EditFirearm": "Edit Firearm",
      "BruiseLethal": "Bruise/Lethal",
      "Bleed": "Bleed",
      "IPTotal": "IP Total:",
      "IPRemaining": "IP Remaining:",
      "Bruise": "Bruise",
      "Lethal": "Lethal"
    },
    "TheYet": {
      "Title": "The Yet",                      [E]
      "InTheYet": "In the Yet",
      "Done": "Done",
      "Frag": "Frag",
      "When": "When",
      "AddYetItem": "Add Yet Item",
      "DeleteYet": "Delete Yet Item",
      "Placeholder": "An event that has yet to happen..."
    },
    "Favors": {
      "Title": "Favors",                      [E]
      "Favor": "Favor",
      "Importance": "Importance",
      "When": "When",
      "AddFavor": "Add Favor",
      "DeleteFavor": "Delete Favor",
      "FavorPlaceholder": "A favor owed or to be collected...",
      "SelectImportance": "Select...",
      "Critical": "Critical",
      "ExtremelyImportant": "Extremely Important",
      "VeryImportant": "Very Important",
      "Important": "Important",
      "ModeratelyImportant": "Moderately Important",
      "LessImportant": "Less Important",
      "Unimportant": "Unimportant",
      "Done": "Done"
    },
    "Relationships": {
      "Title": "Relationships",                [E]
      "Name": "Name",
      "RelationshipType": "Relationship",
      "Sphere": "Sphere",
      "When": "When",
      "Where": "Where",
      "AddRelationship": "Add Relationship",
      "DeleteRelationship": "Delete Relationship",
      "CharacterNamePlaceholder": "Character Name",
      "SelectType": "Select...",
      "Sibling": "Sibling",
      "Parent": "Parent",
      "Grandparent": "Grandparent",
      "Aunt": "Aunt",
      "Uncle": "Uncle",
      "Cousin": "Cousin",
      "Friend": "Friend",
      "Ex": "Ex",
      "Partner": "Partner",
      "Progeny": "Progeny",
      "Spouse": "Spouse",
      "Acquaintance": "Acquaintance",
      "Mentor": "Mentor",
      "Rival": "Rival",
      "Colleague": "Colleague",
      "Ally": "Ally",
      "Enemy": "Enemy",
      "Patron": "Patron",
      "Subordinate": "Subordinate",
      "Superior": "Superior",
      "Public": "Public",
      "Social": "Social",
      "Professional": "Professional",
      "Personal": "Personal",
      "Intimate": "Intimate",
      "Favor": "Favor",
      "FavorPlaceholder": "Favor owed or due...",
      "FavorImportance": "Imp...",
      "LocationMet": "Location Met",
      "EventNotes": "Notes about this relationship..."
    },
    "Vehicles": {
      "Title": "Vehicles",
      "Vehicle": "Vehicle",
      "Operate": "Operate",
      "Mass": "Mass (t)",
      "IP": "IP",
      "Armor": "Armor",
      "Pax": "Pax",
      "AddVehicle": "Add Vehicle",
      "DeleteVehicle": "Delete Vehicle",
      "CustomVehicles": "Custom Vehicles",
      "LandVehicles": "Land Vehicles",
      "AirVehicles": "Air Vehicles",
      "WaterVehicles": "Water Vehicles",
      "EditVehicle": "Edit Vehicle",
      "DriveVerb": "Drive",
      "Pilot": "Pilot",
      "Passengers": "Passengers",
      "AddLandVehicle": "Add Land Vehicle",
      "AddAirVehicle": "Add Air Vehicle",
      "AddWaterVehicle": "Add Water Vehicle"
    },
    "Dialogs": {
      "LogEvent": "Log Event",                [E]
      "LogSpan": "Log Span",                  [E]
      "EditEra": "Edit Era",                  [E]
      "EditExperience": "Edit Experience",    [E]
      "SelectGearType": "Select Gear Type",  [E]
      "CreateEra": "Create Era",              [E]
      "ScheduleYet": "Schedule Yet",          [E]
      "SituationalModifier": "Situational Modifier",
      "Resonance": "Resonance",
      "None": "None",
      "Slight": "Slight",
      "Firm": "Firm",
      "Strong": "Strong",
      "Push": "Push",
      "ActiveApplication": "Active Application",
      "Gear": "Gear",
      "Modifier": "Modifier",
      "Ability": "Ability",
      "Situation": "Situation",
      "Advantage": "Advantage",
      "Normal": "Normal",
      "Disadvantage": "Disadvantage",
      "Cancel": "Cancel",
      "SubjectiveAge": "Subjective Age",
      "Objective": "Objective",
      "ObjectiveDate": "Objective Date",
      "ObjectiveTime": "Objective Time",
      "Spent": "Spent",
      "OriginFrom": "Origin (From)",
      "DestinationTo": "Destination (To)",
      "OriginLocation": "Origin Location",
      "DestinationLocation": "Destination Location",
      "OriginPlaceholder": "e.g. Origin point",
      "DestinationPlaceholder": "e.g. Destination point",
      "LocationPlaceholder": "e.g. Paris",
      "Era": "Era",
      "Experience": "Experience",
      "WhichExperience": "Which experience within this era?",
      "NewExperienceName": "New Experience Name",
      "Title": "eventTitle",
      "Description": "Description",
      "IsSpan": "Is Span",
      "Pulled": "Pulled",
      "PulledHint": "Another spanner carried you",
      "HoursRest": "24h Rest",
      "Blocked": "Blocked",
      "DownstreamImpact": "Downstream Impact",
      "ExperienceOptionsPlaceholder": "Select Experience...",
      "SelectExperience": "Select Experience..."
    },
    "RollDialog": {
      "Rolls": "rolls",
      "RollLabel": "{name} rolls {attribute}",
      "ResonanceExperience": "Select Experience..."
    },
    "Chat": {
      "Readout": "READOUT",
      "DefenderReadout": "DEFENDER READOUT",
      "SituationalMod": "Situational Mod",
      "GearLabel": "Gear: {name}",
      "AbilityLabel": "Ability: {name}",
      "ArmorPenalty": "Armor/Weight Penalty",
      "RunningApplications": "Running Applications",
      "WoundPenaltyIP": "Wound Penalty (IP)",
      "TargetNumber": "Target Number",
      "Total": "Total",
      "MetabilityBacklash": "Metability Backlash",
      "Location": "Location",
      "BaseDamage": "Base Damage",
      "CriticalSuccess": "Critical<br>Success",
      "CriticalFailure": "Critical<br>Failure",
      "Success": "Success",
      "Failure": "Failure",
      "ArmorProtection": "Armor Protection",
      "DamageThroughArmor": "Damage Through Armor",
      "ApplyResults": "Apply Results",
      "ApplyDamageTooltip": "Apply damage and degradation to {name}",
      "GainsActionPoints": "Gains {count} Action Point{s}!",
      "BotchNoAP": "Botch! Gains no Action Points this round.",
      "RollsForAP": "{name} rolls for {attribute} Action Points",
      "Unit": "Unit",
      "Target": "Target",
      "Delta": "Delta",
      "AttributeReduced": "{attr} Reduced",
      "OrgConflictReadout": "ORG CONFLICT READOUT",
      "PrevToNew": "{old} → {new} (−{delta})"
    },
    "Organization": {
      "OperationalMap": "Operational Map",
      "ToggleLifeline": "Toggle Lifeline Graph (Spacebar)",
      "ResetView": "Reset View",
      "Mandate": "Mandate",
      "CreateNewMandate": "Create New Mandate",
      "Physical": "Physical",
      "Espionage": "Espionage",
      "Psyops": "Psyops",
      "Online": "Online",
      "Deploy": "Deploy",
      "Operation": "+ Operation",
      "PhasePeriod": "+ Phase Period",
      "PanZoom": "Pan/Zoom",
      "DragUnitHead": "Drag Unit Head = Deploy",
      "HoldSpaceMap": "Hold Space = Map"
    },
    "Location": {
      "Details": "Details",
      "Attributes": "Attributes",
      "Aspects": "Aspects",
      "Map": "Map & Chronology"
    },
    "NPCImporter": {
      "Title": "AI-Generated NPC JSON",
      "Instructions": "Use an AI to generate an NPC. Give it the prompt below, then paste the resulting JSON here after you have answered the AI's questions.",
      "ClickToViewPrompt": "Click to view the AI prompt",
      "CopyPrompt": "Copy Prompt",
      "ImportNPC": "Import NPC"
    },
    "MapUX": {
      "ZoomLevel": "Zoom: {level}",
      "InteractiveMapControls": "Interactive Map Controls",
      "ZoomInInstruction": "Use mouse wheel to zoom in and out.",
      "DragPanInstruction": "Click and drag to pan the map.",
      "ButtonZoomInstruction": "Use the buttons to zoom.",
      "ApiKeyWarning": "Please edit the HTML file and insert your valid Google Maps API Key to view this standalone demo."
    },
    "Settings": {
      "DebugMode": "Debug Mode",                    [E]
      "DebugModeHint": "Enable debug logging and audit output in the console.", [E]
      "GoogleMapsApiKey": "Google Maps API Key",     [E]
      "GoogleMapsApiKeyHint": "Enter your Google Maps API Key. Requires 'Maps JavaScript API' and 'Geocoding API'.", [E]
      "AiProvider": "AI Provider",                   [E]
      "AiProviderHint": "Choose which AI service to use for NPC generation.", [E]
      "AiProviderGemini": "Google Gemini (direct)",
      "AiProviderOpenRouter": "OpenRouter",
      "AiApiKey": "AI API Key",                      [E]
      "AiApiKeyHint": "Your API key for NPC generation. Use a Google AI Studio key for Gemini, or an OpenRouter key for OpenRouter.",
      "StabilityAiKey": "Stability AI API Key",      [E]
      "StabilityAiKeyHint": "Optional. Enables portrait image generation in the NPC Generator." [E]
    },
    "Errors": {
      "SpanGraphFailed": "Span graph initialization failed",   [E]
      "GeocodeFailed": "Geocoding failed for location",        [E]
      "YetNotFound": "Yet event not found",                     [E]
      "RecordNotFound": "Record not found for deletion"         [E]
    },
    "Tooltips": {
      "SubjectiveAge": "Subjective age in years",              [E]
      "ObjectiveDate": "Objective calendar date",              [E]
      "CalculatedAutomatically": "Calculated automatically from the Lifeline",
      "MinimizeMaximizeEra": "Minimize/Maximize Era",
      "MinimizeMaximizeExperience": "Minimize/Maximize Experience",
      "ToggleSpanEvent": "Toggle Span Event",
      "Toggle24hRest": "Toggle 24h Rest Event",
      "ToggleTrauma": "Toggle Trauma",
      "SetExperienceColor": "Set Experience Color"
    },
    "MetaLabels": {
      "0": "Latent",
      "1": "Novice",
      "2": "Apprentice",
      "3": "Journeyman",
      "4": "Master",
      "5": "Grand Master",
      "RankFallback": "Rank {rank}"
    },
    "GearTypes": {
      "Firearm": "Firearm",
      "Technology": "Technology",
      "Tool": "Tool",
      "Vehicle": "Vehicle",
      "GearTypeQuestion": "What type of gear are you creating?"
    },
    "SpanGraph": {
      "Gated": "Gated",
      "GatedByExternalReputation": "Gated by External Reputation",
      "EmDash": "—"
    },
    "ItemSheets": {
      "Gear": "Gear",
      "Artifact": "Artifact",
      "Ability": "Ability"
    }
  }
}
```

---

## Session 1: Core JS Files + en.json Expansion

### Files to Edit
- `lang/en.json` — Expand with all new key groups listed above
- `modules/sheet-hooks.js` — Localize settings, gear dialog, sheet labels, metaLabel helper
- `continuum.js` — Localize "Gated" string, "—" fallback
- `system-api.js` — Localize roll flavor text, outcome strings

### Detailed Changes

#### `lang/en.json`
Replace the entire file with the full key structure above, filling in all English values. Preserve existing keys marked [E] and add all new ones.

#### `modules/sheet-hooks.js`
- Line 61: `name: "Google Maps API Key"` → `name: game.i18n.localize("CONTINUUM.Settings.GoogleMapsApiKey")`
- Line 62: `hint: "Enter your Google Maps API Key..."` → `hint: game.i18n.localize("CONTINUUM.Settings.GoogleMapsApiKeyHint")`
- Line 71: `name: "AI Provider"` → `name: game.i18n.localize("CONTINUUM.Settings.AiProvider")`
- Line 72: `hint: "Choose which AI service..."` → `hint: game.i18n.localize("CONTINUUM.Settings.AiProviderHint")`
- Lines 77-78: `choices: { gemini: "Google Gemini (direct)", openrouter: "OpenRouter" }` → `choices: { gemini: game.i18n.localize("CONTINUUM.Settings.AiProviderGemini"), openrouter: game.i18n.localize("CONTINUUM.Settings.AiProviderOpenRouter") }`
- Line 84: `name: "AI API Key"` → `name: game.i18n.localize("CONTINUUM.Settings.AiApiKey")`
- Line 85: `hint: "Your API key..."` → `hint: game.i18n.localize("CONTINUUM.Settings.AiApiKeyHint")`
- Line 93: `name: "Stability AI API Key"` → `name: game.i18n.localize("CONTINUUM.Settings.StabilityAiKey")`
- Line 94: `hint: "Optional. Enables portrait..."` → `hint: game.i18n.localize("CONTINUUM.Settings.StabilityAiKeyHint")`
- Line 110: `label: 'Continuum Character Sheet'` → `label: game.i18n.localize("CONTINUUM.SheetLabels.Character")`
- Line 116: `label: 'Continuum Organization Sheet'` → `label: game.i18n.localize("CONTINUUM.SheetLabels.Organization")`
- Line 122: `label: 'Continuum Location Sheet'` → `label: game.i18n.localize("CONTINUUM.SheetLabels.Location")`
- Line 128: `label: 'Continuum Item Sheet'` → `label: game.i18n.localize("CONTINUUM.SheetLabels.Item")`
- Lines 134-135: Handlebars `metaLabel` helper — replace hardcoded array `['Latent', 'Novice', ...]` with localization lookup using `CONTINUUM.MetaLabels`
- Lines 161-165: Gear type dialog labels → localize all `label` values
- Line 183: `eventTitle: 'Select Gear Type'` → `eventTitle: game.i18n.localize("CONTINUUM.Dialogs.SelectGearType")`
- Line 184: `content: '<p>What type of gear are you creating?</p>'` → `content: '<p>' + game.i18n.localize("CONTINUUM.GearTypes.GearTypeQuestion") + '</p>'`

#### `continuum.js`
- Line 37: `<span ...>Gated</span>` → use `game.i18n.localize("CONTINUUM.SpanGraph.Gated")`
- Line 84: `.html('—')` fallback → use `game.i18n.localize("CONTINUUM.SpanGraph.EmDash")` (or keep as em dash is universal)

#### `system-api.js`
- Line 47: `const attributeName = attribute.charAt(0).toUpperCase() + attribute.slice(1);` → use localization for attribute display name
- Line 48: `flavorText` → localize with `game.i18n.format("CONTINUUM.Chat.RollsForAP", {name: actor.name, attribute: attributeName})`
- Line 49: `outcomeText` → localize with `game.i18n.format(...)` for both "Gains X Action Points" and "Botch!" cases

### Verification
```bash
npm test
```

---

## Session 2: Main Sheet Templates

### Files to Edit
- `templates/actor-sheet.html` — Roll dialog labels
- `templates/organization-sheet.html` — Section headers, buttons, legend, instructions
- `templates/location-sheet.html` — Cancel button

### Detailed Changes

#### `templates/actor-sheet.html`
- Line 19: `<span>{{actor.name}}</span> rolls` → `{{actor.name}} {{localize "CONTINUUM.RollDialog.Rolls"}}`
- Line 24: `<label>Situational Modifier</label>` → `<label>{{localize "CONTINUUM.Dialogs.SituationalModifier"}}</label>`
- Line 30: `<h4>Resonance</h4>` → `<h4>{{localize "CONTINUUM.Dialogs.Resonance"}}</h4>`
- Line 34: `<option value="0">Select Experience...</option>` → `<option value="0">{{localize "CONTINUUM.RollDialog.ResonanceExperience"}}</option>`
- Line 38: Labels `None`, `Slight`, `Firm`, `Strong` → localize
- Line 47: `<h4>Push <span class="push-modifier-display">(+0)</span></h4>` → localize "Push"
- Line 64: `<label>Active Application</label>` → `<label>{{localize "CONTINUUM.Dialogs.ActiveApplication"}}</label>`
- Line 66: `<option value="0">None (+0)</option>` → localize
- Line 73: `<h4>Gear</h4>` → `<h4>{{localize "CONTINUUM.Background.Gear"}}</h4>`
- Line 76: `<option value="">None</option>` → localize "None"
- Line 80: `<label class="gear-slider-label">Modifier</label>` → localize
- Line 102: `<h4>Ability</h4>` (spanning ability) → localize
- Line 104: `<option value="0">None (+0)</option>` → localize
- Line 112: `<h4>Ability</h4>` (nat span ability) → localize
- Line 114: `<option value="0">None (+0)</option>` → localize
- Line 122: `<h4>Benefits</h4>` → localize
- Line 129: `<h4>Modifier</h4>` → localize
- Line 151: `<h4>Situation</h4>` → `<h4>{{localize "CONTINUUM.Dialogs.Situation"}}</h4>`
- Line 153: `Advantage` → `{{localize "CONTINUUM.Dialogs.Advantage"}}`
- Line 154: `Normal` → `{{localize "CONTINUUM.Dialogs.Normal"}}`
- Line 155: `Disadvantage` → `{{localize "CONTINUUM.Dialogs.Disadvantage"}}`
- Line 161: `Cancel` → `{{localize "CONTINUUM.Common.Cancel"}}`

#### `templates/organization-sheet.html`
- Line 16: `<h2 class="section-heading">Operational Map</h2>` → localize
- Line 19: `eventTitle="Toggle Lifeline Graph (Spacebar)"` → localize title
- Line 20: `eventTitle="Reset View"` → localize
- Line 27: `Mandate` button text → localize
- Line 39-42: Legend labels `Physical`, `Espionage`, `Psyops`, `Online` → localize
- Line 115: `Deploy` → localize
- Line 123: `+ Operation` → localize
- Line 130: `+ Phase Period` → localize
- Line 140: Instructions: `Pan/Zoom`, drag instruction, hold space instruction → localize
- Line 168: `Cancel` → localize

#### `templates/location-sheet.html`
- Line 19: `Cancel` → localize

### Verification
```bash
npm test
```

---

## Session 3: Section Templates - Personal, Attributes, Background/Gear

### Files to Edit
- `templates/sections/personal.html`
- `templates/sections/attributes.html`
- `templates/sections/background.html`

### Detailed Changes

#### `templates/sections/personal.html`
- Section header `Personal Information` → localize
- All labels: `Name:`, `Identity:`, `Heritage:`, `Height:`, `Locality:`, etc. → localize
- `cm.`, `kg.` units → localize
- Placeholders: `Apparent age or visual description`, `YYYY-MM-DD`, `City, Country`, `Select...` → localize
- Button titles: `Locate on Map`, `Grab Map Center`, `Capture Token Location` → localize
- `Sheet Settings` tooltip → localize

#### `templates/sections/attributes.html`
- Section header `Attributes` → localize
- Roll button labels: `Force`, `Analyze`, `Relate`, `React`, `Temp Will`, `Perm Will` → localize
- Roll tooltips: `Roll Force`, etc. → localize
- `Benefits` heading → localize
- `Set Token Image` button title → localize

#### `templates/sections/background.html`
- Section header `Background & Gear` → localize
- `Stuff`, `Assets: $` → localize
- Gear tab labels: `Firearms`, `Technology`, `Tools`, `Vehicles` → localize
- Column headers: `Item`, `Bonus`, `Aspects`, `Qty`, `Wt`, `Carried` → localize
- Aspect labels with tooltips: `Speed`, `Capacity`, `Connectivity`, `Quality`, `Versatility`, `Durability`, `Handling`, `Acceleration`, `Prestige` → localize
- Vehicle class labels: `Air`, `Water`, `Land` → localize
- Empty placeholders: `Drag a Firearm item...`, etc. → localize
- `Use`, `Edit Item`, `Delete Item` buttons → localize
- `Carried: ... / Limit:` summary → localize

### Verification
```bash
npm test
```

---

## Session 4: Section Templates - Spanning, Metabilities, Experiences, The Yet

### Files to Edit
- `templates/sections/spanning.html`
- `templates/sections/metabilities.html`
- `templates/sections/experiences.html`
- `templates/sections/the_yet.html`

### Detailed Changes

#### `templates/sections/spanning.html`
- Section header → localize
- Button labels: `Span`, `Nat Span`, `Delib Frag`, `Nat Frag` → localize
- `Available Span:`, `Calculate` → localize
- Ability labels: `Ability`, `Natural Span Ability` → localize
- Tooltips: `Cannot Span: Leveller`, `Cannot Span: Overburdened`, `Roll Span` → localize

#### `templates/sections/metabilities.html`
- Section header (note: currently "Metabilites" - keep as-is for now, or fix typo to "Metabilities") → localize
- Button labels: `Coerce`, `Create`, `Farsense`, `Shift`, `Redact` → localize
- Roll tooltips → localize
- Application labels: `Coerce`, `Create`, `Farsense`, `Shift`, `Redact` (ingredient labels) → localize
- `Running`, `Lvl`, `Volume used / max`, `Apply` → localize
- Add/delete tooltips → localize

#### `templates/sections/experiences.html`
- Section header `Eras & Experiences` → localize
- Search placeholder → localize
- Sort toggle title: `Oldest First` / `Newest First` → localize
- `Add Era`, `Add Experience`, `Add Event`, `Add Yet` → localize
- `From:`, `To:` labels → localize
- `Experience Title`, `Event Title`, `Notes` placeholders → localize
- Span direction tooltips: `Span Up`, `Span Level`, `Span Down` → localize
- `Spent`, `Remaining` → localize
- Toggle labels: `Toggle Span Event`, `Toggle 24h Rest Event`, `Toggle Trauma` → localize
- `Link to Keyframe` / `Unlink Keyframe` → localize
- `Spacetime Link` → localize
- Delete tooltips → localize (using Common.CannotDeleteWithContent pattern)

#### `templates/sections/the_yet.html`
- Section header → localize
- Column headers: `In the Yet`, `Done`, `Frag`, `When` → localize
- Placeholder text → localize
- Add/delete buttons/tooltips → localize

### Verification
```bash
npm test
```

---

## Session 5: Section Templates - Combat, Favors, Relationships, Vehicles [COMPLETED]

### Files to Edit
- `templates/sections/combat.html`
- `templates/sections/favors.html`
- `templates/sections/relationships.html`
- `templates/sections/vehicles.html`
- `templates/sections/land_vehicles.html` (if applicable)
- `templates/sections/air_vehicles.html` (if applicable)
- `templates/sections/water_vehicles.html` (if applicable)

### Detailed Changes

#### `templates/sections/combat.html`
- Section header `Combat` → localize
- Subsection headers: `Custom Firearms`, `Ranged Weapons`, `Melee Weapons`, `Armor` → localize
- Column headers: `Weapon`, `Carried`, `Attack`, `Ammo`, `RoF`, `Conc.`, `Enc.`, `Dmg.`, `Armor Type` → localize
- `Firearm` header label → localize
- `Wounds` section headers, `IP`, `Bruise/Lethal`, `Bleed` → localize
- `IP Total:`, `IP Remaining:`, `Total Encumbrance:`, `Force Attribute:`, `Move Penalty:` → localize
- Add buttons, delete tooltips → localize

#### `templates/sections/favors.html`
- Section header, column headers → localize
- Importance select options (keep as data values but display text via localize) → localize
- Placeholder text → localize

#### `templates/sections/relationships.html`
- Section header, column headers → localize
- Relationship type options → localize display text (keep value attributes as-is)
- Placeholder text → localize

#### `templates/sections/vehicles.html`
- Section header, column headers → localize
- Optgroup labels → localize
- Delete button → localize

### Verification
```bash
npm test
```

---

## Session 6: Dialog Templates

### Files to Edit
- `templates/dialogs/event-node-editor.html`
- `templates/dialogs/span-result-dialog.html`
- `templates/dialogs/npc-importer.html`
- `templates/dialog-roll.html`

### Detailed Changes

#### `templates/dialogs/event-node-editor.html`
- Stat labels: `Age`, `Spent`, `Objective` → localize
- Form labels: `Subjective Age`, `Date`, `Time`, `Origin (From)`, `Destination (To)`, `Origin Location`, `Destination Location`, `Objective Date`, `Objective Time`, `Location`, `Era`, `Experience`, `New Experience Name`, `eventTitle`, `Description` → localize
- Placeholders: `YYYY-MM-DD`, `e.g. Origin point`, `e.g. Destination point`, `e.g. Paris` → localize
- Button titles: `Locate`, `Grab Center`, `Capture Token Location` → localize
- Checkboxes: `Is Span`, `Pulled`, `24h Rest`, `Blocked` text → localize
- Hint text: `Another spanner carried you` → localize
- Section headers: `Origin (From)`, `Destination (To)` → localize
- `Which experience within this era?` → localize

#### `templates/dialogs/span-result-dialog.html`
- Same labels as event-node-editor (shared identifiers) → localize
- `Downstream Impact` header → localize

#### `templates/dialogs/npc-importer.html`
- `AI-Generated NPC JSON` label → localize
- Instruction paragraph → localize
- `Click to view the AI prompt` summary → localize
- `Copy Prompt` button title → localize
- `Import NPC` button text → localize
- (Do NOT localize the AI prompt text itself - it's functional content)

#### `templates/dialog-roll.html`
- `Situational Modifier` → localize
- `Resonance` header → localize
- `None`, `Slight`, `Firm`, `Strong` labels → localize

### Verification
```bash
npm test
```

---

## Session 7: Chat Templates + Item Sheet Templates + NPC Generator Templates

### Files to Edit
- `templates/chat-roll.html`
- `templates/chat-org-attack.html`
- `templates/items/item-ability-sheet.html`
- `templates/items/item-artifact-sheet.html`
- `templates/items/item-gear-sheet.html`
- `templates/npc-generator/step-1-identity.html`
- `templates/npc-generator/step-2-time-faction.html`
- `templates/npc-generator/step-3-capabilities.html`
- `templates/npc-generator/step-4-concept.html`
- `templates/npc-generator/step-5-review.html`
- `templates/npc-generator/step-6-complete.html`
- `templates/npc-generator/npc-wizard.html`

### Detailed Changes

#### `templates/chat-roll.html`
- `READOUT` header text → localize
- `Situational Mod` → localize
- `Gear:`, `Ability:` prefixed labels → localize with format
- `Armor/Weight Penalty`, `Running Applications` → localize
- `Wound Penalty (IP)` → localize
- `Target Number`, `Total` → localize
- `Metability Backlash` → localize
- `Location`, `Base Damage` → localize
- `DEFENDER READOUT` → localize
- `Target`, `Armor Protection`, `Damage Through Armor` → localize
- `Apply Results` button → localize
- `Critical Success`, `Critical Failure` → localize

#### `templates/chat-org-attack.html`
- `ORG CONFLICT READOUT` → localize
- `Unit`, `Target`, `Delta` → localize
- `Reduced` label → localize

#### Item sheet templates (read each file and localize all labels)

#### NPC generator templates (read each file and localize all labels, buttons, placeholders)

### Verification
```bash
npm test
```

---

## Session 8: Org Section Templates + Location Section Templates + Apps [COMPLETED]

### Files to Edit
- `templates/sections/org-structure.html`
- `templates/sections/org-attributes.html`
- `templates/sections/org-mandates.html`
- `templates/sections/org-methods.html`
- `templates/sections/org-conflict.html`
- `templates/sections/org-balance-sheet.html`
- `templates/sections/org-network.html`
- `templates/sections/org-graph.html`
- `templates/sections/npc-combat-card.html`
- `templates/sections/location-details.html`
- `templates/sections/location-attributes.html`
- `templates/sections/location-aspects.html`
- `templates/sections/location-map.html`
- `templates/apps/all-lifelines.html`

### Detailed Changes
Read each file, identify all hardcoded English strings, add keys to `lang/en.json`, and replace with `{{localize}}` calls.

### Verification
```bash
npm test
```

---

## Session 9: JS Dialog Handlers + Tooltip/Interaction JS [COMPLETED]

### Files to Edit
- All files in `modules/span-graph/interaction/` — dialog construction with hardcoded strings
- `modules/span-graph/ui/tooltips.js` — tooltip text
- `modules/lifeline/services/ui/` — UI service strings
- `modules/character/handle-*.js` — handler strings (dialog text, confirmations)
- `modules/sheet-handlers-help.js` — help content
- `modules/sheet-handlers-export.js` — export labels
- `modules/span-graph/dialogs/` and `modules/span-graph/actions/` — if they contain user-facing strings
- `modules/npc-generator/` — NPC generation dialog strings

### Detailed Changes
For each JS file:
1. Search for all string literals that appear in the UI (Dialog content, ui.notifications, tooltip text, error messages to users)
2. Replace with `game.i18n.localize("CONTINUUM.Key")` or `game.i18n.format("CONTINUUM.Key", {var: value})`
3. Add any missing keys to `lang/en.json`

### Verification
```bash
npm test
```

---

## Session 10: Remaining JS + Final Audit

### Files to Edit
- Any remaining JS files with hardcoded strings found in:
  - `modules/span-graph-dialog-*.js` (legacy dialog builders)
  - `modules/organization/` — org sheet handlers
  - `modules/location/` — location sheet handlers
  - `modules/combat/` — combat socket messages
  - `modules/relationships/` — relationship module strings
- `lang/en.json` — Final cleanup and verification

### Tasks
1. Grep entire `modules/` directory for remaining hardcoded English strings in JS files
2. Grep entire `templates/` directory for remaining hardcoded English strings in HTML files
3. Verify every `{{localize "CONTINUUM.*"}}` call has a matching key in `lang/en.json`
4. Verify every `game.i18n.localize("CONTINUUM.*")` call has a matching key in `lang/en.json`
5. Remove any duplicate or orphaned keys from `lang/en.json`
6. Run full test suite: `npm test`

### Verification Commands
```bash
# Find any remaining bare English strings in templates (excluding attributes, variables, CSS)
rg -n '[>"\s](Add|Delete|Edit|Save|Cancel|Help|Name|Description|Title|Notes|None|Select)[<"\s]' templates/

# Find any remaining bare English strings in JS Dialog calls
rg -n 'content:.*[A-Z]' modules/

# Verify all localization keys exist
node -e "const en = require('./lang/en.json'); console.log('Keys:', Object.keys(en.CONTINUUM).length);"

# Run full test suite
npm test
```

---

## Notes

### Handling `<select>` Options
For `<select>` elements with game-mechanical values (like relationship types, goal importance, fraternity, era), the `value` attribute must remain unchanged (it's data). Only the display text inside `<option>` tags should be localized. Example:

```html
<!-- Before -->
<option value="Sibling">Sibling</option>
<!-- After -->
<option value="Sibling">{{localize "CONTINUUM.Relationships.Sibling"}}</option>
```

### Handling `eventTitle` Attributes
Foundry uses `eventTitle` or `title` attributes for tooltips. These should be localized:

```html
<!-- Before -->
<button eventTitle="Edit Item">
<!-- After -->
<button eventTitle="{{localize 'CONTINUUM.Common.Edit'}}">
```

In JS:
```javascript
// Before
title: "Edit Item"
// After
title: game.i18n.localize("CONTINUUM.Common.Edit")
```

### Handlebars Conditional Localizations
For strings inside `{{#if}}` blocks with fallbacks:

```html
<!-- Before -->
data-tooltip="{{#unless (isDeletable . 'era')}}Cannot delete an element with content{{else}}Delete Era{{/unless}}"
<!-- After -->
data-tooltip="{{#unless (isDeletable . 'era')}}{{localize 'CONTINUUM.Common.CannotDeleteWithContent'}}{{else}}{{localize 'CONTINUUM.Experiences.DeleteEra'}}{{/unless}}"
```

### Strings with HTML in JS
For JS code that builds HTML strings with user-visible text:

```javascript
// Before
const html = `<p>What type of gear are you creating?</p>`;
// After
const html = `<p>${game.i18n.localize("CONTINUUM.GearTypes.GearTypeQuestion")}</p>`;
```

### Strings with Interpolation
Use `game.i18n.format()` for strings with variables:

```javascript
// Before
const flavorText = `${actor.name} rolls for ${attributeName} Action Points`;
// After
const flavorText = game.i18n.format("CONTINUUM.Chat.RollsForAP", {name: actor.name, attribute: attributeName});
```