export const WIZARD_STEPS = {
  IDENTITY: 1,
  TIME_FACTION: 2,
  CAPABILITIES: 3,
  CONCEPT: 4,
  REVIEW: 5,
  COMPLETE: 6
};

export const ERA_OPTIONS = [
  { value: 'Ancient', label: 'Ancient' },
  { value: 'Medieval', label: 'Medieval' },
  { value: 'Ariesian', label: 'Ariesian' },
  { value: 'Tauran', label: 'Tauran' },
  { value: 'Piscean', label: 'Piscean' },
  { value: 'Aquarian', label: 'Aquarian' }
];

export const FRATERNITY_OPTIONS = [
  { value: 'Engineers', label: 'Engineers' },
  { value: 'Foxhorn', label: 'Foxhorn' },
  { value: 'Physicians', label: 'Physicians' },
  { value: 'Scribes', label: 'Scribes' },
  { value: 'Antequarians', label: 'Antequarians' },
  { value: 'Moneychangers', label: 'Moneychangers' },
  { value: 'Quicker', label: 'Quicker' },
  { value: 'Thesbians', label: 'Thesbians' },
  { value: 'None', label: 'None / Unaffiliated' },
  { value: 'Unknown', label: 'Unknown' }
];

export { REGION_CULTURE_MAP, REGION_OPTIONS } from './npc-name-helper.js';

export const METABILITY_OPTIONS = [
  { value: 'coercion', label: 'Coercion' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'farsense', label: 'Farsense' },
  { value: 'pk', label: 'PK' },
  { value: 'redaction', label: 'Redaction' }
];

export const METABILITY_RANK_LABELS = ['Latent', 'Novice', 'Apprentice', 'Journeyman', 'Master', 'Grand Master'];

export const ATTRIBUTE_PRESETS = [
  { value: 'balanced', label: 'Balanced (all 4)' },
  { value: 'physical', label: 'Physical (High Body/Quick)' },
  { value: 'intellectual', label: 'Intellectual (High Mind/EQ)' },
  { value: 'social', label: 'Social (High EQ/Mind)' },
  { value: 'custom', label: 'Custom' }
];

export const ROLE_OPTIONS = [
  { value: 'Antagonist', label: 'Antagonist' },
  { value: 'Ally', label: 'Ally' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Unknown', label: 'Unknown' }
];

export const NPC_TYPE_OPTIONS = [
  { value: 'Leveler', label: 'Leveler (no knowledge of the Continuum)' },
  { value: 'continuum-v2', label: 'Continuum Agent (Spanner)' },
  { value: 'Narcissist', label: 'Narcissist (Spanner)' },
  { value: 'Mentor', label: 'Mentor (Operant Spanner)' }
];

export function createInitialState() {
  return {
    step: WIZARD_STEPS.IDENTITY,
    data: {
      name: '',
      region: '',
      culture: '',
      pronouns: '',
      era: 'Aquarian',
      fraternity: 'None',
      npcType: 'Leveler',
      spanRank: 0,
      isOperant: false,
      metabilities: {
        coercion: 0,
        creativity: 0,
        farsense: 0,
        pk: 0,
        redaction: 0
      },
      attributePreset: 'balanced',
      customAttributes: {
        body: 4,
        mind: 4,
        eq: 4,
        quick: 4
      },
      role: 'Neutral',
      concept: '',
      relatedActorId: '',
      gmNotes: '',
      generationResult: null,
      imagePrompt: '',
      portraitPath: '',
      createdActorId: null,
      pcLinkRelationship: 'Acquaintance',
      dob: '',
      birthLocation: ''
    }
  };
}
