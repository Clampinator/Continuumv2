const CULTURE_URL_MAP = {
  'english': 'english_names.php',
  'scottish': 'scottish_names.php',
  'irish': 'irish_names.php',
  'welsh': 'welsh_names.php',
  'french': 'french_names.php',
  'german': 'german_names.php',
  'dutch': 'dutch_names.php',
  'italian': 'italian_names.php',
  'spanish': 'spanish_names.php',
  'portuguese': 'portuguese_names.php',
  'greek': 'greek_names.php',
  'nordic': 'norse_names.php',
  'swedish': 'swedish_names.php',
  'finnish': 'finnish_names.php',
  'russian': 'russian_names.php',
  'ukrainian': 'ukrainian_names.php',
  'polish': 'polish_names.php',
  'czech': 'czech_names.php',
  'roman': 'roman_names.php',
  'celtic': 'celtic_names.php',
  'hungarian': 'hungarian_names.php',
  'arab': 'arabian_names.php',
  'persian': 'persian_names.php',
  'turkish': 'turkish_names.php',
  'hebrew': 'jewish_names.php',
  'egyptian': 'egyptian_names.php',
  'moroccan': 'arabian_names.php',
  'levantine': 'arabian_names.php',
  'iraqi': 'arabian_names.php',
  'nigerian': 'nigerian_names.php',
  'ghanaian': 'african_names.php',
  'ethiopian': 'african_names.php',
  'kenyan': 'african_names.php',
  'somali': 'african_names.php',
  'south-african': 'african_names.php',
  'zulu': 'african_names.php',
  'yoruba': 'african_names.php',
  'chinese': 'chinese_names.php',
  'japanese': 'japanese_names.php',
  'korean': 'korean_names.php',
  'vietnamese': 'vietnamese_names.php',
  'mongolian': 'mongolian_names.php',
  'tibetan': 'tibetan_names.php',
  'filipino': 'filipino_names.php',
  'indonesian': 'indonesian_names.php',
  'malay': 'malay_names.php',
  'thai': 'thai_names.php',
  'indian': 'indian_names.php',
  'pakistani': 'pakistani_names.php',
  'bengali': 'indian_names.php',
  'sri-lankan': 'indian_names.php',
  'nepali': 'indian_names.php',
  'maori': 'maori_names.php',
  'hawaiian': 'hawaiian_names.php',
  'polynesian': 'polynesian_names.php',
  'aboriginal': 'australian_names.php',
  'pakistani-central-asian': 'pakistani_names.php',
  'kazakh': 'mongolian_names.php',
  'afghan': 'persian_names.php',
  'native-american': 'native_american_names.php',
  'navajo': 'native_american_names.php',
  'inuit': 'inuit_names.php',
  'aztec': 'aztec_names.php',
  'mayan': 'mayan_names.php',
  'incan': 'south_american_names.php',
  'colombian': 'south_american_names.php',
  'brazilian': 'portuguese_names.php'
};

export const REGION_CULTURE_MAP = {
  'Europe': [
    { value: 'english', label: 'English' },
    { value: 'scottish', label: 'Scottish' },
    { value: 'irish', label: 'Irish' },
    { value: 'welsh', label: 'Welsh' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'dutch', label: 'Dutch' },
    { value: 'italian', label: 'Italian' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'greek', label: 'Greek' },
    { value: 'nordic', label: 'Nordic' },
    { value: 'swedish', label: 'Swedish' },
    { value: 'finnish', label: 'Finnish' },
    { value: 'russian', label: 'Russian' },
    { value: 'ukrainian', label: 'Ukrainian' },
    { value: 'polish', label: 'Polish' },
    { value: 'czech', label: 'Czech' },
    { value: 'hungarian', label: 'Hungarian' },
    { value: 'celtic', label: 'Celtic' },
    { value: 'roman', label: 'Roman' }
  ],
  'Middle East & North Africa': [
    { value: 'arab', label: 'Arab' },
    { value: 'persian', label: 'Persian' },
    { value: 'turkish', label: 'Turkish' },
    { value: 'hebrew', label: 'Hebrew' },
    { value: 'egyptian', label: 'Egyptian' },
    { value: 'moroccan', label: 'Moroccan' },
    { value: 'levantine', label: 'Levantine' },
    { value: 'iraqi', label: 'Iraqi' },
    { value: 'afghan', label: 'Afghan' }
  ],
  'Sub-Saharan Africa': [
    { value: 'nigerian', label: 'Nigerian' },
    { value: 'ghanaian', label: 'Ghanaian' },
    { value: 'ethiopian', label: 'Ethiopian' },
    { value: 'kenyan', label: 'Kenyan' },
    { value: 'somali', label: 'Somali' },
    { value: 'south-african', label: 'South African' },
    { value: 'zulu', label: 'Zulu' },
    { value: 'yoruba', label: 'Yoruba' }
  ],
  'East Asia': [
    { value: 'chinese', label: 'Chinese' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'korean', label: 'Korean' },
    { value: 'vietnamese', label: 'Vietnamese' },
    { value: 'mongolian', label: 'Mongolian' },
    { value: 'tibetan', label: 'Tibetan' }
  ],
  'South & Southeast Asia': [
    { value: 'indian', label: 'Indian' },
    { value: 'pakistani', label: 'Pakistani' },
    { value: 'bengali', label: 'Bengali' },
    { value: 'sri-lankan', label: 'Sri Lankan' },
    { value: 'nepali', label: 'Nepali' },
    { value: 'thai', label: 'Thai' },
    { value: 'filipino', label: 'Filipino' },
    { value: 'indonesian', label: 'Indonesian' },
    { value: 'malay', label: 'Malay' }
  ],
  'Central Asia': [
    { value: 'kazakh', label: 'Kazakh' },
    { value: 'pakistani-central-asian', label: 'Central Asian' },
    { value: 'afghan', label: 'Afghan' }
  ],
  'Oceania': [
    { value: 'maori', label: 'Maori' },
    { value: 'hawaiian', label: 'Hawaiian' },
    { value: 'polynesian', label: 'Polynesian' },
    { value: 'aboriginal', label: 'Australian Aboriginal' }
  ],
  'North America': [
    { value: 'native-american', label: 'Native American' },
    { value: 'navajo', label: 'Navajo' },
    { value: 'inuit', label: 'Inuit' }
  ],
  'Mesoamerica': [
    { value: 'aztec', label: 'Aztec' },
    { value: 'mayan', label: 'Maya' }
  ],
  'South America': [
    { value: 'incan', label: 'Incan' },
    { value: 'colombian', label: 'Colombian' },
    { value: 'brazilian', label: 'Brazilian' }
  ]
};

export const REGION_OPTIONS = Object.keys(REGION_CULTURE_MAP).map(r => ({ value: r, label: r }));

export function getBrowseNamesUrl(culture) {
  if (!culture || !CULTURE_URL_MAP[culture]) {
    return 'https://www.fantasynamegenerators.com/';
  }
  return `https://www.fantasynamegenerators.com/${CULTURE_URL_MAP[culture]}`;
}

export function getNameSuggestionsPrompt(culture) {
  if (!culture) {
    return 'Suggest 3-5 names appropriate for the character\'s cultural background.';
  }

  const label = REGION_CULTURE_MAP
    ? Object.values(REGION_CULTURE_MAP).flat().find(c => c.value === culture)?.label
    : null;

  const cultureLabel = label || culture.replace(/-/g, ' ');

  return `Suggest 3-5 culturally appropriate ${cultureLabel} names. Pick the best one for the character's name field and list the others in a "nameSuggestions" array.`;
}