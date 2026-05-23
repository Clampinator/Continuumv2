import { getLoreContext } from './npc-lore.js';

export async function generateNPC(wizardData, apiKey, addLog) {
  const provider = game.settings.get('continuum-v2', 'aiProvider') || 'gemini';

  if (provider === 'openrouter') {
    return generateWithOpenRouter(wizardData, apiKey, addLog);
  }

  return generateWithGemini(wizardData, apiKey, addLog);
}

async function generateWithGemini(wizardData, apiKey, addLog) {
  const model = 'gemini-2.5-flash';
  const prompt = buildPrompt(wizardData);
  addLog(`Generating with ${model} (Gemini direct)...`);

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'The generated character name' },
      nameSuggestions: { type: 'ARRAY', items: { type: 'STRING' }, description: '3-5 alternative culturally appropriate names' },
      narrative: { type: 'STRING', description: 'A 3-paragraph narrative biography' },
      secret: { type: 'STRING', description: 'One-sentence secret for the GM' },
      imagePrompt: { type: 'STRING', description: 'Photo-realistic portrait prompt for image generation. Must specify photorealistic, DSLR quality, natural lighting, and appropriate era-appropriate clothing and setting.' },
      foundryJson: {
        type: 'OBJECT',
        description: 'FoundryVTT actor system data object',
        properties: {
          personal: {
            type: 'OBJECT',
            properties: {
              heritage: { type: 'STRING' },
              pronouns: { type: 'STRING' },
              era: { type: 'STRING' },
              fraternity: { type: 'STRING' },
              grace: { type: 'STRING' },
              invitationDate: { type: 'STRING' },
              locality: { type: 'STRING' },
              dob: { type: 'STRING', description: 'Date of birth in YYYY-MM-DD format' },
              birthLocation: { type: 'STRING', description: 'City, Country format birthplace' }
            }
          },
          background: { type: 'STRING' },
          ages: {
            type: 'ARRAY',
            description: 'Broad life STAGES that cover the entire life with NO OVERLAP and NO GAPS. Every age MUST have name, dateFrom (YYYY-MM-DD), and dateTo (YYYY-MM-DD). Example: [{name: "Childhood", dateFrom: "1965-03-15", dateTo: "1977-06-30"}, {name: "Adolescence", dateFrom: "1977-07-01", dateTo: "1983-08-31"}, ...]. NOT the same as experiences.',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'Random 16-char alphanumeric' },
                name: { type: 'STRING', description: 'Life stage name e.g. Childhood, Adolescence, Career' },
                dateFrom: { type: 'STRING', description: 'Start date YYYY-MM-DD' },
                dateTo: { type: 'STRING', description: 'End date YYYY-MM-DD' }
              },
              required: ['name', 'dateFrom', 'dateTo']
            }
          },
          experiences: {
            type: 'ARRAY',
            description: 'Specific ACTIVITIES the character DID (jobs, school, relationships). NOT life stages. Each must have a clear end date.',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Name of the experience period' },
                description: { type: 'STRING', description: 'Brief description' },
                dateFrom: { type: 'STRING', description: 'Start date YYYY-MM-DD' },
                dateTo: { type: 'STRING', description: 'End date YYYY-MM-DD' },
                location: { type: 'STRING', description: 'City, Country where this took place' }
              }
            }
          },
          lifelineEvents: {
            type: 'ARRAY',
            description: 'Array of lifeline events tracing the character life. Every experience MUST have a start event (isExpStart=true) and an end event (isExpEnd=true) with matching experienceId.',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                eventTitle: { type: 'STRING' },
                eventNotes: { type: 'STRING' },
                date: { type: 'STRING', description: 'YYYY-MM-DD' },
                time: { type: 'STRING', description: 'HH:MM:SS' },
                location: { type: 'STRING', description: 'City, Country' },
                eventIsSpan: { type: 'BOOLEAN' },
                eventIsRest: { type: 'BOOLEAN', description: 'true for rest/recovery events (24h rest to refill span pool)' },
                experienceId: { type: 'STRING', description: 'EXACT name of the experience this event belongs to' },
                isExpStart: { type: 'BOOLEAN', description: 'true ONLY on the first event that starts an experience' },
                isExpEnd: { type: 'BOOLEAN', description: 'true ONLY on the last event that ends an experience' },
                eventSpanFromDate: { type: 'STRING' },
                eventSpanFromTime: { type: 'STRING' },
                eventSpanFromLocation: { type: 'STRING' },
                eventSpanToDate: { type: 'STRING' },
                eventSpanToTime: { type: 'STRING' },
                eventSpanToLocation: { type: 'STRING' }
              }
            }
          },
          relationships: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                relationshipType: { type: 'STRING' },
                eventNotes: { type: 'STRING' }
              }
            }
          },
          favors: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                direction: { type: 'STRING' },
                eventNotes: { type: 'STRING' }
              }
            }
          }
        }
      }
    },
    required: ['name', 'narrative', 'secret', 'imagePrompt', 'foundryJson']
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.8,
        maxOutputTokens: 32768
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const rawContent = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawContent) {
    const blockReason = json.candidates?.[0]?.finishReason;
    const safetyMsg = json.candidates?.[0]?.safetyRatings;
    throw new Error(`No content in Gemini response${blockReason ? ` (reason: ${blockReason})` : ''}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    // Step 2: strip any non-JSON preamble/suffix
    let jsonStr = rawContent;
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e2) {
      // Step 3: fix trailing commas only - do NOT escape newlines as that
      // corrupts structural JSON whitespace and makes things worse
      let repaired = jsonStr
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*\}/g, '}');
      try {
        parsed = JSON.parse(repaired);
      } catch (e3) {
        // Step 4: truncation repair - start from the first '{' in the FULL
        // rawContent to recover the maximum data, then close open brackets
        const firstBrace = rawContent.indexOf('{');
        let truncated = firstBrace >= 0 ? rawContent.slice(firstBrace) : jsonStr;
        const openBrackets = (truncated.match(/\[/g) || []).length - (truncated.match(/\]/g) || []).length;
        const openBraces = (truncated.match(/\{/g) || []).length - (truncated.match(/\}/g) || []).length;
        truncated += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
        try {
          parsed = JSON.parse(truncated);
        } catch (e4) {
          throw new Error(`Failed to parse JSON from Gemini response: ${e.message}. Raw content starts with: ${rawContent.substring(0, 200)}`);
        }
      }
    }
  }

  return parsed;
}

async function generateWithOpenRouter(wizardData, apiKey, addLog) {
  const model = 'google/gemini-2.5-flash-preview-05-20';
  const prompt = buildPrompt(wizardData);
  addLog(`Generating with ${model} (OpenRouter)...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-eventTitle': 'Continuum NPC Generator'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_object',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The generated character name' },
            nameSuggestions: { type: 'array', items: { type: 'string' }, description: '3-5 alternative culturally appropriate names' },
            narrative: { type: 'string', description: 'A 3-paragraph narrative biography' },
            secret: { type: 'string', description: 'One-sentence secret for the GM' },
            imagePrompt: { type: 'string', description: 'Photo-realistic portrait prompt for image generation. Must specify photorealistic, DSLR quality, natural lighting, and appropriate era-appropriate clothing and setting.' },
            foundryJson: {
              type: 'object',
              description: 'FoundryVTT actor system data object',
              properties: {
                personal: {
                  type: 'object',
                  properties: {
                    heritage: { type: 'string' },
                    pronouns: { type: 'string' },
                    era: { type: 'string' },
                    fraternity: { type: 'string' },
                    grace: { type: 'string' },
                    invitationDate: { type: 'string' },
                    locality: { type: 'string' },
                    dob: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
                    birthLocation: { type: 'string', description: 'City, Country format birthplace' }
                  }
                },
                background: { type: 'string' },
                ages: {
                  type: 'array',
                  description: 'Broad life STAGES covering entire life with NO OVERLAP and NO GAPS. Every age MUST have name, dateFrom (YYYY-MM-DD), and dateTo (YYYY-MM-DD). NOT the same as experiences.',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Random 16-char alphanumeric' },
                      name: { type: 'string', description: 'Life stage name e.g. Childhood, Career' },
                      dateFrom: { type: 'string', description: 'Start date YYYY-MM-DD' },
                      dateTo: { type: 'string', description: 'End date YYYY-MM-DD' }
                    },
                    required: ['name', 'dateFrom', 'dateTo']
                  }
                },
                experiences: {
                  type: 'array',
                  description: 'Specific ACTIVITIES the character DID (jobs, school, relationships). NOT life stages.',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Name of the experience period' },
                      description: { type: 'string' },
                      dateFrom: { type: 'string', description: 'Start date YYYY-MM-DD' },
                      dateTo: { type: 'string', description: 'End date YYYY-MM-DD' },
                      location: { type: 'string', description: 'City, Country' }
                    }
                  }
                },
                lifelineEvents: {
                  type: 'array',
                  description: 'Array of lifeline events. Every experience MUST have a start event (isExpStart=true) and an end event (isExpEnd=true) with matching experienceId.',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      eventTitle: { type: 'string' },
                      eventNotes: { type: 'string' },
                      date: { type: 'string', description: 'YYYY-MM-DD' },
                      time: { type: 'string', description: 'HH:MM:SS' },
                      location: { type: 'string', description: 'City, Country' },
                      eventIsSpan: { type: 'boolean' },
                      eventIsRest: { type: 'boolean', description: 'true for rest/recovery events (24h rest to refill span pool)' },
                      experienceId: { type: 'string', description: 'EXACT name of the experience this event belongs to' },
                      isExpStart: { type: 'boolean', description: 'true ONLY on the first event that starts an experience' },
                      isExpEnd: { type: 'boolean', description: 'true ONLY on the last event that ends an experience' },
                      eventSpanFromDate: { type: 'string' },
                      eventSpanFromTime: { type: 'string' },
                      eventSpanFromLocation: { type: 'string' },
                      eventSpanToDate: { type: 'string' },
                      eventSpanToTime: { type: 'string' },
                      eventSpanToLocation: { type: 'string' }
                    }
                  }
                },
                relationships: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      relationshipType: { type: 'string' },
                      eventNotes: { type: 'string' }
                    }
                  }
                },
                favors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      direction: { type: 'string' },
                      eventNotes: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          required: ['name', 'narrative', 'secret', 'imagePrompt', 'foundryJson']
        }
      },
      max_tokens: 32768,
      temperature: 0.8
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const rawContent = json.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('No content in OpenRouter response');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    // Step 2: strip any non-JSON preamble/suffix
    let jsonStr = rawContent;
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e2) {
      // Step 3: fix trailing commas only - do NOT escape newlines as that
      // corrupts structural JSON whitespace and makes things worse
      let repaired = jsonStr
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*\}/g, '}');
      try {
        parsed = JSON.parse(repaired);
      } catch (e3) {
        // Step 4: truncation repair - start from the first '{' in the FULL
        // rawContent to recover the maximum data, then close open brackets
        const firstBrace = rawContent.indexOf('{');
        let truncated = firstBrace >= 0 ? rawContent.slice(firstBrace) : jsonStr;
        const openBrackets = (truncated.match(/\[/g) || []).length - (truncated.match(/\]/g) || []).length;
        const openBraces = (truncated.match(/\{/g) || []).length - (truncated.match(/\}/g) || []).length;
        truncated += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
        try {
          parsed = JSON.parse(truncated);
        } catch (e4) {
          throw new Error(`Failed to parse JSON from OpenRouter response: ${e.message}. Raw content starts with: ${rawContent.substring(0, 200)}`);
        }
      }
    }
  }

  return parsed;
}

function buildPrompt(wizardData) {
  const {
    name, region, culture, pronouns,
    era, fraternity, npcType, spanRank,
    isOperant, metabilities,
    attributePreset, customAttributes,
    role, concept, gmNotes,
    dob, birthLocation
  } = wizardData;

  const isLeveler = npcType === 'Leveler';
  const isContinuum = npcType === 'continuum-v2';
  const isNarcissist = npcType === 'Narcissist';
  const isMentor = npcType === 'Mentor';
  const isSpanner = !isLeveler;

  let existenceType, allegiance, loreConstraints;

  if (isLeveler) {
    existenceType = 'Leveler (ordinary human)';
    allegiance = 'N/A - Leveler';
    loreConstraints = `CRITICAL: This character is a Leveler - an ordinary person with NO knowledge of the Continuum, spanning, fraternities, metabilities, or any time-travel concepts. Their narrative must NEVER mention or reference:
- Spanning, Spanners, or time travel
- Any fraternity (Engineers, Foxhorn, Physicians, Scribes, Antequarians, Moneychangers, Quicker, Thesbians)
- The Continuum or its Maxims
- Narcissists or narcotics
- Any metabilities or teleportation
- "Fragging" or temporal manipulation
- Levelers live normal linear lives with no awareness of the time-travel reality around them.`;
  } else if (isContinuum) {
    existenceType = `Spanner (Span ${spanRank})`;
    allegiance = 'Continuum Agent';
    loreConstraints = `This character is a Continuum Agent - a Spanner who follows the Maxims of the Continuum and belongs to the ${fraternity} fraternity. They are part of the structured society of time-travelers who preserve the timeline. Include their fraternity culture and Span-related experiences.`;
  } else if (isNarcissist) {
    existenceType = `Spanner (Span ${spanRank})`;
    allegiance = 'Narcissist';
    loreConstraints = `This character is a Narcissist - a Spanner who rejects the Continuum and its Maxims. Narcissists pursue their own agendas across time, often manipulating events for personal gain. They do NOT follow the Maxims. They may or may not claim a fraternity affiliation. Their narrative should reflect cynical or rebellious attitudes toward the Continuum.`;
  } else if (isMentor) {
    existenceType = `Spanner (Span ${spanRank})`;
    allegiance = 'Mentor (Continuum Agent)';
    loreConstraints = `This character is a Mentor - a senior Operant Spanner in the ${fraternity} fraternity who trains novices. Mentors are always Operant and typically Span 3 or higher. They have deep knowledge of the Continuum, its history, and their fraternity's traditions. Include their role as a guide and teacher of younger Spanners.`;
  }

  const metabilityType = isOperant ? 'Operant' : 'Latent';

  const metabilityDetails = isOperant
    ? Object.entries(metabilities)
        .filter(([_, rank]) => rank > 0)
        .map(([meta, rank]) => `${meta} rank ${rank}`)
        .join(', ') || 'None specified'
    : 'Latent';

  const attrDetails = attributePreset === 'custom'
    ? `Force ${customAttributes.force}, Analyze ${customAttributes.analyze}, Relate ${customAttributes.relate}, React ${customAttributes.react}`
    : attributePreset;

  const nameInstruction = name
    ? `Name: ${name} (keep this name)`
    : `Name: Generate an appropriate name. Also provide 3-5 alternative culturally appropriate names in nameSuggestions.`;

  let prompt = `You are a Continuum RPG NPC generation system. Generate a detailed NPC based on these parameters:

**Identity**
- ${nameInstruction}
- Heritage/Culture: ${region} / ${culture}
- Pronouns: ${pronouns || 'unspecified'}${dob ? `
- Date of Birth: ${dob}` : ''}${birthLocation ? `
- Birthplace: ${birthLocation}` : ''}

**Time & Faction**
- Era: ${era}
- NPC Type: ${existenceType}
- Allegiance: ${allegiance}`;

  if (isSpanner) {
    prompt += `
- Fraternity: ${fraternity}
- Span Rank: ${spanRank}`;
  }

  prompt += `

**Capabilities**
- Metability type: ${metabilityType}
- Metabilities: ${metabilityDetails}
- Attributes: ${attrDetails}

**Concept**
- Role: ${role}
- Concept: ${concept || 'not specified'}
- GM eventNotes: ${gmNotes || 'none'}

${loreConstraints}

${getLoreContext(npcType, fraternity, era)}

Generate a complete NPC with ${isLeveler ? '10-15' : isMentor ? '30-50' : isNarcissist ? '25-35' : '20-30'} lifeline events across 3-5 ages. The events should trace this character's life from childhood through their current era, with realistic locations and${isSpanner ? ' span travel appropriate to their rank' : ' linear timeline progression'}.

1. **name** - A culturally appropriate name (or keep provided name if given)
2. **nameSuggestions** - If no name was provided, suggest 3-5 alternative culturally appropriate names. If a name was provided, still suggest 3-5 alternatives for variety.
3. **narrative** - A compelling 3-paragraph narrative bio in second-person perspective, set in the ${era} era${isSpanner ? `, with ${fraternity} fraternity context` : ''}
4. **secret** - One sentence GM-only secret/motivation/plot hook
5. **imagePrompt** - A detailed photo-realistic portrait prompt for image generation. MUST include: 'photorealistic', 'DSLR quality', 'natural lighting', era-appropriate clothing and setting. The portrait should look like a real photograph of the character, not an illustration or painting.
6. **foundryJson** - A complete FoundryVTT character actor system data object with:
   - personal: {heritage, pronouns, era, fraternity${isLeveler ? ' (MUST be empty string)' : ''}, grace (empty string), invitationDate${isLeveler ? ' (empty string - Levelers are never invited)' : ''}, locality, dob (date in YYYY-MM-DD format${dob ? ` - MUST be ${dob}` : ''}), birthLocation (a real geocodeable city/region like "Paris, France" or "Tokyo, Japan")}
   - background: The full narrative biography

IMPORTANT - AGES vs EXPERIENCES:
Ages are broad life STAGES (like chapters of a life). They do NOT overlap. Examples: "Childhood" (birth to age 12), "Adolescence" (age 12-18), "Young Adulthood" (age 18-30), "Career" (age 30-50), "Later Years" (age 50+). Every date in the character's life must fall within exactly one Age. Ages cover the character's entire life from birth to now with no gaps.

Experiences are SPECIFIC ACTIVITIES the character DID (jobs, training, relationships, memberships). They sit INSIDE an Age. Examples: "Apprenticeship at Zurich Corner" (a 3-year training period), "Served in French Foreign Legion" (a 5-year military stint), "Medical School" (4 years), "Marriage to Elena" (a 10-year relationship). Experiences are skills and life periods that the character can draw on later. They must have a clear start and end date.

   - ages: 3-5 age entries. Each age covers a life stage with NO OVERLAP and NO GAPS between ages. Fields: id (random 16-char alphanumeric), name (e.g. "Childhood", "Adolescence", "Young Adulthood", "Career", "Later Years"), dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD). The ages should cover from birth to the character's current age.
- experiences: 5-8 experiences. Each MUST have:
      - name: descriptive name (e.g. "Oxford University", "French Foreign Legion", "Steel Mill Welder", "Marriage to Elena")
      - description: 1-2 sentence summary
      - dateFrom: start date in YYYY-MM-DD format
      - dateTo: end date in YYYY-MM-DD format. EVERY experience MUST have a dateTo. Only 1-2 experiences total can be "current" (dateTo near the present day). See EXPERIENCE RULES below.
      - location: real city, country (e.g. "Zurich, Switzerland")
    - lifelineEvents: 15-50 events depending on character complexity. Each event has:
      - id: random 16-char alphanumeric string
      - eventTitle: short event name (e.g. "Graduated from Oxford", "Joined the Engineers", "Moved to Paris", "First Span")
      - eventNotes: 1-2 sentence description
      - date: YYYY-MM-DD format
      - time: HH:MM:SS format (default "12:00:00"). CRITICAL: Every event MUST have a UNIQUE date+time combination. No two events can share the exact same date and time. Increment the time by at least 1 second for events on the same day.
      - location: a real, geocodeable place name with country (e.g. "Zurich, Switzerland", "London, England", "Cairo, Egypt")
      - experienceId: (optional) the EXACT name of the experience this event belongs to. Use this for the first event ("Started X") and last event ("Completed X"/"Left X") of each experience, plus any events in between.
      - isExpStart: boolean, true ONLY on the first event that begins an experience. Must also have experienceId set.
      - isExpEnd: boolean, true ONLY on the last event that ends an experience. Must also have experienceId set.
      - eventIsRest: boolean, true for rest/recovery events where the character rests for 24 hours to refill their span pool. Only used for Spanners. Rest events have eventIsSpan: false.${isSpanner ? `
      - eventIsSpan: boolean, true for span events. See SPAN POOL RULES below for distance and pool limits.
      - For span events, also include: eventSpanFromDate, eventSpanFromTime, eventSpanFromLocation, eventSpanToDate, eventSpanToTime, eventSpanToLocation` : ''}
    - relationships: at least 3 named relationships. Each has id, name${isSpanner ? ', relationshipType (one of: Sibling, Parent, Friend, Colleague, Mentor, Student, Rival, Superior, Subordinate, Acquaintance, Spouse)' : ', relationshipType (one of: Family, Friend, Colleague, Neighbor, Rival)'}, eventNotes.
    - favors: at least 2 favors. Each has id, name, direction ("owed" or "owing"), eventNotes.

CRITICAL EXPERIENCE BRACKETING AND DURATION RULES:
Experiences are specific activities with a clear beginning AND end. Think of them as resume entries - jobs end, school ends, apprenticeships end.

REALISTIC DURATIONS - every experience must have a plausible duration for its type:
- Elementary School: 5-7 years (ages 5-11 or 6-12)
- High School: 3-5 years (ages 13-18)
- University/Bachelors: 3-5 years
- Medical/Law School: 3-4 years additional after undergrad
- Military Service: 2-6 years (conscripts 2-3, career 4-6+)
- Apprenticeship: 2-5 years
- Internship/Residency: 1-4 years
- First job after education: 1-5 years typically
- Career position: 3-15 years
- Marriage: varies widely, give a realistic range
- A single hobby/club membership: 2-10 years

CHRONOLOGICAL ORDERING - education experiences MUST end before or during the career that follows:
- High School ENDS before or concurrent with the start of University (you don't attend high school for 10 years while also at university)
- University ENDS before starting a career in that field
- Apprenticeships END before working independently
- Education experiences do NOT overlap with later career experiences unless the character was studying while working

CLOSED EXPERIENCES (the vast majority - at least 5 of 6-8 total):
- "Oxford University" dateFrom: 1988-09-01, dateTo: 1991-06-15 -> 3 years, ends at graduation
- "French Foreign Legion" dateFrom: 1985-03-01, dateTo: 1990-08-15 -> 5 years, ends at discharge
- "Apprenticeship at Zurich Corner" dateFrom: 1995-01-10, dateTo: 1998-06-20 -> 3.5 years, training ends
- "Steel Mill Welder" dateFrom: 1992-04-01, dateTo: 1997-11-30 -> 5.5 years, left the job
- "Medical Residency" dateFrom: 1998-07-01, dateTo: 2001-06-30 -> 3 years, residency completes

OPEN EXPERIENCES (at most 1-2, the character's current situation):
- "Senior Analyst at Exotechnics" dateFrom: 2010-03-01, dateTo: near present day
- "Living in Geneva" dateFrom: 2015-09-01, dateTo: near present day

For EVERY experience, create bracketing events in lifelineEvents:
1. A START event with isExpStart: true, experienceId matching the experience name, eventTitle like "Started [Experience Name]", date matching dateFrom
2. An END event with isExpEnd: true, experienceId matching the experience name, eventTitle like "Completed [Experience Name]" or "Left [Experience Name]", date matching dateTo
3. Optional MIDDLE events with experienceId set (no isExpStart/isExpEnd), for key moments within the experience

Example for "Oxford University" experience:
  lifelineEvents: [
    { eventTitle: "Started Oxford University", date: "1988-09-01", experienceId: "Oxford University", isExpStart: true, ... },
    { eventTitle: "Passed Prelims", date: "1989-06-15", experienceId: "Oxford University", ... },
    { eventTitle: "Completed Oxford University", date: "1991-06-15", experienceId: "Oxford University", isExpEnd: true, ... }
  ]

Do NOT create experiences for life stages like "Childhood" or "Adolescence" - those are Ages, not Experiences.

BEFORE RETURNING JSON, verify these consistency checks:
1. No experience extends longer than realistic for its type (e.g., no "High School" lasting 15 years, no "University" lasting 10 years)
2. Education experiences END before or concurrent with career start dates (High School ends before University starts or overlaps by at most 1 year)
3. Every experience has dateTo that is after dateFrom
4. At most 1-2 experiences have dateTo near the present day (ongoing); all others are clearly closed
5. Ages cover the entire life from birth to present with no gaps and no overlaps
6. Every lifelineEvent date falls within one of the Ages${isSpanner ? `\n7. For span events: cumulative time-travel duration does not exceed the pool for this character's Span level (Span ${spanRank} pool = ${spanRank === 1 ? '1' : spanRank === 2 ? '10' : spanRank === 3 ? '100' : spanRank === 4 ? '1,000' : '10,000'} years). Insert eventIsRest: true rest events when the pool would be exhausted.\n8. No span jump exceeds the per-jump distance limit (Span ${spanRank} max = ${spanRank === 1 ? '1 km' : spanRank === 2 ? '10 km' : spanRank === 3 ? '100 km' : spanRank === 4 ? '1,000 km' : '10,000 km'}). Spatial travel beyond this must be summarized, not itemized.\n9. Rest events (eventIsRest: true) have eventIsSpan: false and occur roughly 24 hours after the pool-exhausting span.\n10. Span events are NEVER adjacent - there is ALWAYS at least 1 second of level time between spans. Two eventIsSpan: true events cannot share the same timestamp.` : ''}

${isSpanner ? `SPAN POOL RULES - This character is Span ${spanRank}:
Spanners can teleport through time (spanning). Each span jump has two limits:

| Span | Max Distance per Jump | Time Pool (cumulative) | Rest After Pool Exhausted |
|------|----------------------|------------------------|---------------------------|
| 1    | 1 km                 | 1 year                 | 24 hours level time       |
| 2    | 10 km                | 10 years               | 24 hours level time       |
| 3    | 100 km               | 100 years              | 24 hours level time       |
| 4    | 1,000 km             | 1,000 years            | 24 hours level time       |
| 5    | 10,000 km            | 10,000 years           | 24 hours level time       |

This character is Span ${spanRank}: max ${spanRank === 1 ? '1 km per jump, 1 year pool' : spanRank === 2 ? '10 km per jump, 10 year pool' : spanRank === 3 ? '100 km per jump, 100 year pool' : spanRank === 4 ? '1,000 km per jump, 1,000 year pool' : '10,000 km per jump, 10,000 year pool'}.

TIME TRAVEL rules:
- Each time-travel span consumes years from the pool equal to the duration of the jump. Example: A Span 3 spanning from 1920 to 1870 uses 50 years of their 100-year pool, leaving 50 years remaining.
- CRITICAL: One may NEVER span instantly after spanning. The character MUST exist level for at least 1 second before spanning again. This means you cannot place two eventIsSpan: true events at the exact same timestamp. Every span must be separated by at least 1 second of level time (insert a level event, a rest event, or simply increment the time by at least 1 second).
- When the pool is exhausted, the character MUST rest for 24 hours (level time) before spanning again. Insert an eventIsRest: true event titled something like "Recovered After Spanning" or "Rest at Zurich Corner". This rest event resets the pool to full.
- A character can make multiple spans as long as the cumulative time duration does not exceed their pool. Track the pool internally: start at full, subtract each span's duration, and when you reach 0 or less, you MUST insert a rest event before the next span.
- Do NOT exceed the pool limit. If a single span would exceed the remaining pool, the character must rest first, then span.

SPAN 1 CHARACTERS - SPECIAL ATTENTION REQUIRED:
- Span 1 characters have only a 1-year pool. This is exhausted VERY quickly. After ANY time-travel span longer than a few months, they will need to rest.
- For example: A Span 1 character spans from 2020 to 2019 (1 year). Pool is now EMPTY. They MUST have a rest event (eventIsRest: true) before spanning again.
- Another example: A Span 1 spans from 2020 to 2019-06-01 (6 months), then spans to 2019-01-01 (another 5 months). That's 11 months total - pool nearly empty. Next span of more than 1 month would require a rest first.
- When in doubt, REST. Span 1 characters rest frequently. Include the rest events in the lifelineEvents array with eventIsRest: true.

SPATIAL TRAVEL (location change only, no time travel):
- If the character needs to travel a distance within their per-jump limit, summarize it in ONE span event. Do NOT itemize every small jump. Example: "Traveled from Paris to Berlin" is ONE event for a Span 4+, not 880 separate 1 km span events.
- For a Span 1 (1 km/jump), a cross-city move of 5 km could be summarized as "Traveled across Geneva via multiple short spans".
- Only create individual span events for TIME TRAVEL jumps. Spatial movement is hand-waved in the narrative.

Include ${isMentor ? '8-15' : '4-8'} time-travel span events and ${isMentor ? '2-4' : '1-2'} rest events appropriate to this character's span rank and life story. Every rest event must have eventIsRest: true and eventIsSpan: false.` : 'This is a Leveler - they do NOT have any span events or rest events. All events are level (linear time) events only. Do NOT set eventIsSpan or eventIsRest to true.'}

LOCATIONS: Every event MUST have a realistic, geocodeable location. Use format "City, Country" (e.g. "Paris, France", "New York, USA", "Kyoto, Japan"). Locations should be consistent with the era - use period-appropriate city names where applicable.
CRITICAL LOCATION RULE: NEVER use fictional Continuum-universe location names as event locations. Corners, fraternity halls, and spanner meeting places are SECRET and operate inside real buildings in real cities. Use the REAL CITY, not the corner name. Example: if an event happens at "Der Spanner" corner in Zurich, write location "Zurich, Switzerland" - NOT "Der Spanner" or "Zurich Corner". The location must be a real place that OpenStreetMap can find.

CRITICAL: The character name must NOT be "Vance" or contain "Vance".
CRITICAL: Dates must be in YYYY-MM-DD format appropriate for the ${era} era.
CRITICAL: Return ONLY valid JSON - no markdown, no explanation, just the JSON object.`;

  return prompt;
}
