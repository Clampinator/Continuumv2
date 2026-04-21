import { createInitialState, WIZARD_STEPS, ERA_OPTIONS, FRATERNITY_OPTIONS, REGION_OPTIONS, REGION_CULTURE_MAP, METABILITY_OPTIONS, ATTRIBUTE_PRESETS, ROLE_OPTIONS, NPC_TYPE_OPTIONS } from './npc-state.js';
import { closeNPCGeneratorWizard } from './index.js';
import { generateNPC } from './npc-ai-client.js';
import { buildActorFromAIResponse, enrichActorLifeline, linkToPC } from './npc-actor-builder.js';
import { getBrowseNamesUrl } from './npc-name-helper.js';

export class NPCWizardApp extends Application {
  constructor() {
    super();
    this.state = createInitialState();
    this._generatedData = null;
    this._createdActor = null;
    this._foundryJson = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'npc-generator-wizard',
      title: 'NPC Generator',
      template: 'systems/continuum-v2/templates/npc-generator/npc-wizard.html',
      classes: ['continuum-v2', 'npc-wizard'],
      width: 700,
      height: 680,
      resizable: true
    });
  }

  async _render(force, options) {
    await getTemplate('systems/continuum-v2/templates/npc-generator/step-6-complete.html');
    return super._render(force, options);
  }

  getData(options) {
    const step = this.state.step;
    const data = this.state.data;
    return {
      step,
      steps: [
        { num: 1, label: 'Identity', active: step === 1, completed: step > 1 },
        { num: 2, label: 'Time & Faction', active: step === 2, completed: step > 2 },
        { num: 3, label: 'Capabilities', active: step === 3, completed: step > 3 },
        { num: 4, label: 'Concept', active: step === 4, completed: step > 4 },
        { num: 5, label: 'Review', active: step === 5, completed: step > 5 },
        { num: 6, label: 'Complete', active: step === 6, completed: false }
      ],
      ...data,
      ERA_OPTIONS,
      FRATERNITY_OPTIONS,
      REGION_OPTIONS,
      METABILITY_OPTIONS,
      ATTRIBUTE_PRESETS,
      ROLE_OPTIONS,
      NPC_TYPE_OPTIONS
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._setupNavigation(html);
    this._setupStepListeners(html);
    this._populateIdentityStep(html);
  }

  _setupNavigation(html) {
    html.find('.npc-wizard-btn-next').on('click', () => this._advanceStep());
    html.find('.npc-wizard-btn-back').on('click', () => this._retreatStep());
    html.find('.npc-wizard-btn-cancel').on('click', () => closeNPCGeneratorWizard());
  }

  _populateIdentityStep(html) {
    const regionSelect = html.find('#npc-region');
    if (regionSelect.length) {
      regionSelect.empty().append('<option value="">-- Select Region --</option>');
      REGION_OPTIONS.forEach(r => {
        regionSelect.append(`<option value="${r.value}">${r.label}</option>`);
      });
      if (this.state.data.region) {
        regionSelect.val(this.state.data.region);
      }
    }
  }

  _setupStepListeners(html) {
    const step = this.state.step;

    if (step === WIZARD_STEPS.IDENTITY) {
      this._setupIdentityStep(html);
    } else if (step === WIZARD_STEPS.TIME_FACTION) {
      this._setupTimeFactionStep(html);
    } else if (step === WIZARD_STEPS.CAPABILITIES) {
      this._setupCapabilitiesStep(html);
    } else if (step === WIZARD_STEPS.CONCEPT) {
      this._setupConceptStep(html);
    } else if (step === WIZARD_STEPS.REVIEW) {
      this._setupReviewStep(html);
    } else if (step === WIZARD_STEPS.COMPLETE) {
      this._setupCompleteStep(html);
    }
  }

  _setupTimeFactionStep(html) {
    html.find('#npc-era').on('change', (e) => { this.state.data.era = e.target.value; });
    html.find('#npc-fraternity').on('change', (e) => { this.state.data.fraternity = e.target.value; });

    html.find('#npc-type').on('change', (e) => {
      this.state.data.npcType = e.target.value;
      this._refreshTypeFields(html);
    });

    html.find('.span-rank-btn').on('click', (e) => {
      const rank = parseInt(e.currentTarget.dataset.rank);
      this.state.data.spanRank = rank;
      html.find('.span-rank-btn').removeClass('selected');
      e.currentTarget.classList.add('selected');
    });
    const initialRank = this.state.data.spanRank ?? 1;
    if (initialRank >= 1 && initialRank <= 5) {
      html.find(`.span-rank-btn[data-rank="${initialRank}"]`).addClass('selected');
    }

    this._refreshTypeFields(html);
  }

  _setupCapabilitiesStep(html) {
    const isMentor = this.state.data.npcType === 'Mentor';
    if (isMentor) {
      this.state.data.isOperant = true;
      const operantCheckbox = html.find('#npc-isOperant');
      operantCheckbox.prop('checked', true).prop('disabled', true);
      const operantHint = html.find('#operant-hint');
      operantHint.text('Mentors are always Operant. This cannot be changed.');
    }

    html.find('#npc-isOperant').on('change', (e) => {
      if (this.state.data.npcType === 'Mentor') {
        e.target.checked = true;
        return;
      }
      this.state.data.isOperant = e.target.checked;
      this._refreshMetabilityGrid(html);
    });

    html.find('#npc-attr-preset').on('change', (e) => {
      this.state.data.attributePreset = e.target.value;
      this._refreshAttributeFields(html);
    });

    METABILITY_OPTIONS.forEach(meta => {
      html.find(`input[name="metability-${meta.value}"]`).on('change', (e) => {
        this.state.data.metabilities[meta.value] = parseInt(e.target.value) || 0;
      });
    });

    ['body', 'mind', 'eq', 'quick'].forEach(attr => {
      html.find(`#npc-attr-${attr}`).on('input', (e) => {
        this.state.data.customAttributes[attr] = parseInt(e.target.value) || 0;
      });
    });

    this._refreshMetabilityGrid(html);
    this._refreshAttributeFields(html);
  }

  _setupIdentityStep(html) {
    html.find('#npc-region').on('change', (e) => {
      this.state.data.region = e.target.value;
      this.state.data.culture = '';
      this._refreshCultureOptions(html, e.target.value);
    });

    html.find('#npc-culture').on('change', (e) => {
      this.state.data.culture = e.target.value;
    });

html.find('#npc-name').on('input', (e) => { this.state.data.name = e.target.value; });
    html.find('#npc-pronouns').on('input', (e) => { this.state.data.pronouns = e.target.value; });

    html.find('.browse-names-btn').on('click', () => {
      window.open(getBrowseNamesUrl(this.state.data.culture), '_blank');
    });
  }

  _setupConceptStep(html) {
    html.find('#npc-role').on('change', (e) => { this.state.data.role = e.target.value; });
    html.find('#npc-dob').on('change', (e) => { this.state.data.dob = e.target.value; });
    html.find('#npc-birth-location').on('input', (e) => { this.state.data.birthLocation = e.target.value; });
    html.find('#npc-concept').on('input', (e) => { this.state.data.concept = e.target.value; });
    html.find('#npc-gm-notes').on('input', (e) => { this.state.data.gmNotes = e.target.value; });

    const actorSelect = html.find('#npc-relatedActor');
    game.actors.contents.forEach(actor => {
      actorSelect.append(`<option value="${actor.id}">${actor.name}</option>`);
    });
    actorSelect.on('change', (e) => { this.state.data.relatedActorId = e.target.value; });
  }

  _setupReviewStep(html) {
    html.find('.npc-wizard-btn-generate').on('click', () => this._handleGenerate(html));
    html.find('.copy-prompt-btn').on('click', () => this._handleCopyPrompt(html));
    html.find('.npc-wizard-btn-portrait').on('click', () => this._handlePortrait(html));
    html.find('.npc-wizard-btn-create').on('click', () => this._handleCreateActor(html));
  }

  async _handleGenerate(html) {
    const logEl = html.find('.generation-log');
    const resultsEl = html.find('.results-section');

    logEl.empty().addClass('visible').scrollTop(0);
    resultsEl.addClass('hidden');

    const addLog = (msg) => {
      const entry = $(`<div class="log-entry">> ${msg}</div>`);
      logEl.append(entry);
      logEl.scrollTop(logEl[0].scrollHeight);
    };

    addLog('Querying archive for subject parameters...');

    try {
      const apiKey = game.settings.get('continuum-v2', 'geminiApiKey');
      if (!apiKey) {
        addLog('ERROR: AI API key not configured. Go to Settings > Configure Settings > System Settings.');
        return;
      }

      const provider = game.settings.get('continuum-v2', 'aiProvider') || 'gemini';
      addLog(`Using ${provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'}...`);
      const result = await generateNPC(this.state.data, apiKey, addLog);
      this._generatedData = result;

      addLog(`Subject ${result.name} reconstructed. Archive stable.`);

      html.find('.bio-text').html(result.narrative.replace(/\n/g, '<br>'));
      html.find('.secret-text').text(result.secret);
      html.find('.image-prompt-text').text(result.imagePrompt);

      if (result.nameSuggestions && result.nameSuggestions.length > 0) {
        const suggestionsEl = html.find('.name-suggestions');
        const listEl = html.find('.name-suggestions-list');
        listEl.empty();
        result.nameSuggestions.forEach(suggestion => {
          listEl.append(`<span class="name-suggestion-chip">${suggestion}</span>`);
        });
        suggestionsEl.show();
      }

      resultsEl.removeClass('hidden');

      const portraitBtn = html.find('.npc-wizard-btn-portrait');
      const stabilityKey = game.settings.get('continuum-v2', 'stabilityAiKey');
      if (stabilityKey) {
        portraitBtn.prop('disabled', false);
        html.find('.portrait-hint').text('Click to generate portrait image');
      }

    } catch (err) {
      console.error(err);
      addLog('ERROR: Temporal paradox detected. Archive connection lost.');
    }
  }

  _handleCopyPrompt(html) {
    const text = html.find('.image-prompt-text').text();
    navigator.clipboard.writeText(text);
    ui.notifications.info('Image prompt copied to clipboard.');
  }

  async _handlePortrait(html) {
    const stabilityKey = game.settings.get('continuum-v2', 'stabilityAiKey');
    if (!stabilityKey) return;

    const prompt = html.find('.image-prompt-text').text();
    if (!prompt) return;

    try {
      const { generatePortrait } = await import('./npc-image-client.js');
      const { path, previewUrl } = await generatePortrait(prompt, stabilityKey);
      if (previewUrl) {
        this.state.data.portraitPath = path || previewUrl;
        html.find('.portrait-preview').attr('src', previewUrl).show();
        ui.notifications.info('Portrait generated.');
      }
    } catch (err) {
      console.error(err);
      ui.notifications.error('Failed to generate portrait.');
    }
  }

  async _handleCreateActor(html) {
    if (!this._generatedData) {
      ui.notifications.error('Please generate an NPC first.');
      return;
    }

    const createBtn = html.find('.npc-wizard-btn-create');
    createBtn.prop('disabled', true).text('Creating...');

    const logEl = html.find('.generation-log');
    const addLog = (msg) => {
      const entry = $(`<div class="log-entry">> ${msg}</div>`);
      logEl.append(entry);
      logEl.scrollTop(logEl[0].scrollHeight);
    };

    try {
      addLog('Creating actor...');
      const { actor, foundryJson } = await buildActorFromAIResponse(this._generatedData, this.state.data);

      if (!actor) {
        ui.notifications.error('Failed to create actor.');
        createBtn.prop('disabled', false).text('Create Actor');
        return;
      }

      ui.notifications.info(`Actor "${actor.name}" created.`);
      addLog(`Actor "${actor.name}" created.`);

      this.state.data.createdActorId = actor.id;
      this._createdActor = actor;
      this._foundryJson = foundryJson;

      addLog('Enriching lifeline with locations...');
      try {
        await enrichActorLifeline(actor, foundryJson, this.state.data, addLog);
        addLog('Lifeline enrichment complete.');
      } catch (lifelineErr) {
        console.warn('Lifeline enrichment failed:', lifelineErr);
        addLog('Lifeline enrichment had issues (actor still created).');
      }

      this.state.step = WIZARD_STEPS.COMPLETE;
      this.render();

    } catch (err) {
      console.error(err);
      ui.notifications.error('Failed to create actor.');
      createBtn.prop('disabled', false).text('Create Actor');
    }
  }

  _setupCompleteStep(html) {
    const actorId = this.state.data.createdActorId;
    const actor = this._createdActor || (actorId ? game.actors.get(actorId) : null);

    const nameEl = html.find('.complete-actor-name');
    const linkSection = html.find('.complete-link-section');
    const linkBtn = html.find('.complete-link-btn');
    const openBtn = html.find('.complete-open-sheet-btn');
    const closeBtn = html.find('.complete-close-btn');

    if (actor) {
      nameEl.text(actor.name);
    }

    const pcActors = game.actors.filter(a => a.type === 'character' && a.owned);
    const pcSelect = html.find('#npc-pc-select');
    pcSelect.empty().append('<option value="">-- Select a PC --</option>');
    pcActors.forEach(pc => {
      pcSelect.append(`<option value="${pc.id}">${pc.name}</option>`);
    });

    linkBtn.on('click', async () => {
      const pcId = pcSelect.val();
      const relType = html.find('#npc-relationship-type').val();
      if (!pcId || !actor) {
        ui.notifications.warn('Select a PC to link.');
        return;
      }
      const pcActor = game.actors.get(pcId);
      if (!pcActor) {
        ui.notifications.error('Selected PC not found.');
        return;
      }

      linkBtn.prop('disabled', true).text('Linking...');
      try {
        await linkToPC(actor, pcActor, relType);
        ui.notifications.info(`Linked "${actor.name}" to "${pcActor.name}".`);
        linkBtn.text('Linked!').prop('disabled', true);
        linkSection.append(`<p class="complete-link-confirm">Linked to ${pcActor.name} as ${relType}.</p>`);
      } catch (err) {
        console.error(err);
        ui.notifications.error('Failed to link to PC.');
        linkBtn.prop('disabled', false).text('Link to PC');
      }
    });

    openBtn.on('click', () => {
      if (actor) actor.sheet.render(true);
    });

    closeBtn.on('click', () => closeNPCGeneratorWizard());
  }

  _refreshCultureOptions(html, region) {
    const cultureSelect = html.find('#npc-culture');
    cultureSelect.empty().append('<option value="">-- Select Culture --</option>');

    const cultures = REGION_CULTURE_MAP[region] || [];
    cultures.forEach(c => {
      cultureSelect.append(`<option value="${c.value}">${c.label}</option>`);
    });
  }

  _refreshTypeFields(html) {
    const npcType = this.state.data.npcType;
    const isLeveler = npcType === 'Leveler';
    const isSpanner = !isLeveler;
    const isMentor = npcType === 'Mentor';

    const spannerFields = html.find('.spanner-fields');
    if (isSpanner) {
      spannerFields.removeClass('hidden');
    } else {
      spannerFields.addClass('hidden');
    }

    const typeHint = html.find('#npc-type-hint');
    if (isLeveler) {
      typeHint.text('Levelers have no knowledge of the Continuum, spanning, or fraternities.');
    } else if (npcType === 'continuum-v2') {
      typeHint.text('Continuum Agents are Spanners who follow the Maxims of their fraternity.');
    } else if (npcType === 'Narcissist') {
      typeHint.text('Narcissists are Spanners who reject the Continuum and its Maxims.');
    } else if (isMentor) {
      typeHint.text('Mentors are senior Operant Spanners who train novices in their fraternity.');
    }

    if (isLeveler) {
      this.state.data.fraternity = 'None';
      this.state.data.spanRank = 0;
      this.state.data.isOperant = false;
      const fraternitySelect = html.find('#npc-fraternity');
      if (fraternitySelect.length) fraternitySelect.val('None');
      html.find('.span-rank-btn').removeClass('selected');
    } else if (isMentor) {
      if (this.state.data.spanRank < 3) {
        this.state.data.spanRank = 3;
        html.find('.span-rank-btn').removeClass('selected');
        html.find('.span-rank-btn[data-rank="3"]').addClass('selected');
      }
      this.state.data.isOperant = true;
    } else {
      if (this.state.data.spanRank === 0) {
        this.state.data.spanRank = 1;
        html.find('.span-rank-btn').removeClass('selected');
        html.find('.span-rank-btn[data-rank="1"]').addClass('selected');
      }
    }
  }

  _refreshMetabilityGrid(html) {
    const grid = html.find('.metability-grid');
    if (this.state.data.isOperant) {
      grid.removeClass('hidden');
    } else {
      grid.addClass('hidden');
      this.state.data.metabilities = { coercion: 0, creativity: 0, farsense: 0, pk: 0, redaction: 0 };
      METABILITY_OPTIONS.forEach(meta => {
        html.find(`input[name="metability-${meta.value}"][value="0"]`).prop('checked', true);
      });
    }
  }

  _refreshAttributeFields(html) {
    const customFields = html.find('.custom-attributes');
    if (this.state.data.attributePreset === 'custom') {
      customFields.removeClass('hidden');
    } else {
      customFields.addClass('hidden');
    }
  }

  _advanceStep() {
    if (this.state.step < WIZARD_STEPS.COMPLETE) {
      this.state.step++;
      this.render();
    }
  }

  _retreatStep() {
    if (this.state.step > WIZARD_STEPS.IDENTITY && this.state.step < WIZARD_STEPS.COMPLETE) {
      this.state.step--;
      this.render();
    }
  }

  setGeneratedData(data) {
    this._generatedData = data;
  }
}
