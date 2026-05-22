/*
Registers a "Vehicle Combat" section in the Scene Configuration dialog.
GMs can toggle vehicle combat on/off for a scene and select the
environment domain (land, air, water, space).
Injects into the Scene Config form, using the same pattern as the
working SpaceTime module: requestAnimationFrame + app.element fallback.
*/

const ENVIRONMENT_OPTIONS = [
  { value: 'none', label: 'Disabled', icon: 'fa-ban' },
  { value: 'land', label: 'Land', icon: 'fa-mountain' },
  { value: 'air', label: 'Air', icon: 'fa-cloud' },
  { value: 'water', label: 'Water', icon: 'fa-water' },
  { value: 'space', label: 'Space', icon: 'fa-rocket' }
];

let registered = false;

export function registerSceneConfig() {
  if (registered) return;
  registered = true;

  Hooks.on('renderSceneConfig', (app, html) => {
    // Defer one frame so ApplicationV2 finishes its post-render work first
    requestAnimationFrame(() => {
      _injectVehicleCombatSection(app, html);
    });
  });
}

function _injectVehicleCombatSection(app, html) {
  // ApplicationV2 uses app.element; legacy uses jQuery html
  const root = app.element ?? ((html instanceof HTMLElement) ? html : html[0]);
  if (!root) return;

  // Prevent double-injection
  if (root.querySelector('#vc-config-wrapper')) return;

  const scene = app.document ?? app.object;
  if (!scene) return;

  const currentEnv = scene.getFlag('continuum-v2', 'vehicleCombat.domain') ?? 'none';
  const currentGravity = scene.getFlag('continuum-v2', 'vehicleCombat.gravity') ?? 1.0;
  const currentAtmDensity = scene.getFlag('continuum-v2', 'vehicleCombat.atmosphereDensity') ?? 1.0;

  let envRadios = '';
  for (const opt of ENVIRONMENT_OPTIONS) {
    const checked = opt.value === currentEnv ? 'checked' : '';
    envRadios += `
      <label class="vehicle-env-option${opt.value === currentEnv ? ' active' : ''}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:2px solid #444;border-radius:6px;cursor:pointer;margin:2px;${opt.value === currentEnv ? 'border-color:#6600ff;background:#330066;' : ''}">
        <input type="radio" name="vc-domain" value="${opt.value}" ${checked} style="display:none">
        <i class="fas ${opt.icon}"></i> ${opt.label}
      </label>`;
  }

  const gravityDisplay = currentEnv === 'space' ? '' : 'display:none';
  const atmDisplay = (currentEnv === 'air' || currentEnv === 'water') ? '' : 'display:none';

  const wrapper = document.createElement('div');
  wrapper.id = 'vc-config-wrapper';
  wrapper.style.cssText = 'margin:8px 0;padding:8px 12px;border:1px solid #555;border-radius:4px;pointer-events:auto;position:relative;z-index:1';
  wrapper.innerHTML = `
    <p style="margin:0 0 6px;font-size:0.85em;color:#c9c7b8;font-weight:bold;">
      <i class="fas fa-rocket"></i> Vehicle Combat
    </p>
    <div class="form-group">
      <label>Combat Domain</label>
      <div class="form-fields" style="flex-wrap:wrap">
        ${envRadios}
      </div>
    </div>
    <div class="form-group vc-gravity-group" style="${gravityDisplay}">
      <label>Gravity (g)</label>
      <div class="form-fields">
        <input type="range" id="vc-gravity" min="0" max="3" step="0.1" value="${currentGravity}" style="pointer-events:auto">
        <span id="vc-gravity-val" style="min-width:30px;text-align:right;font-family:monospace">${currentGravity}g</span>
      </div>
    </div>
    <div class="form-group vc-atmosphere-group" style="${atmDisplay}">
      <label>Atmosphere Density</label>
      <div class="form-fields">
        <input type="range" id="vc-atm" min="0" max="2" step="0.1" value="${currentAtmDensity}" style="pointer-events:auto">
        <span id="vc-atm-val" style="min-width:30px;text-align:right;font-family:monospace">${currentAtmDensity}</span>
      </div>
    </div>
    <button type="button" id="vc-open-scene-btn" ${currentEnv === 'none' ? 'disabled style="opacity:0.5"' : ''} style="pointer-events:auto;cursor:pointer;width:100%;margin-top:8px">
      <i class="fas fa-cube"></i> Open Vehicle Combat Scene
    </button>
    <p id="vc-saved-msg" style="margin:4px 0 0;font-size:0.8em;color:#3fb950;display:none">Saved.</p>
  `;

  // Insert before the footer, or append to form/body
  const form = root.querySelector('form');
  const footer = root.querySelector('footer, .sheet-footer');
  if (footer && footer.parentNode === form) {
    form.insertBefore(wrapper, footer);
  } else if (form) {
    form.appendChild(wrapper);
  } else {
    root.appendChild(wrapper);
  }

  // Event listeners
  const flash = () => {
    const msg = root.querySelector('#vc-saved-msg');
    if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 1500); }
  };

  const saveFlags = async () => {
    if (!game.user.isGM || !scene) return;
    const domain = root.querySelector('input[name="vc-domain"]:checked')?.value ?? 'none';
    const gravity = parseFloat(root.querySelector('#vc-gravity')?.value) ?? 1.0;
    const atmDensity = parseFloat(root.querySelector('#vc-atm')?.value) ?? 1.0;

    await scene.setFlag('continuum-v2', 'vehicleCombat', {
      domain,
      gravity,
      atmosphereDensity: atmDensity
    });
    flash();
    Hooks.callAll('vehicle-combat.sceneConfigChanged', scene);
  };

  // Domain radio changes
  root.querySelectorAll('input[name="vc-domain"]').forEach((input) => {
    input.addEventListener('change', async (ev) => {
      const val = ev.target.value;
      root.querySelector('.vc-gravity-group').style.display = val === 'space' ? '' : 'none';
      root.querySelector('.vc-atmosphere-group').style.display = (val === 'air' || val === 'water') ? '' : 'none';
      const btn = root.querySelector('#vc-open-scene-btn');
      if (btn) btn.disabled = val === 'none';
      if (btn) btn.style.opacity = val === 'none' ? '0.5' : '1';
      root.querySelectorAll('.vehicle-env-option').forEach((l) => {
        l.style.borderColor = '#444';
        l.style.background = '';
      });
      ev.target.closest('.vehicle-env-option').style.borderColor = '#6600ff';
      ev.target.closest('.vehicle-env-option').style.background = '#330066';
      await saveFlags();
    });
  });

  // Range sliders
  root.querySelector('#vc-gravity')?.addEventListener('input', (ev) => {
    root.querySelector('#vc-gravity-val').textContent = ev.target.value + 'g';
  });
  root.querySelector('#vc-gravity')?.addEventListener('change', saveFlags);

  root.querySelector('#vc-atm')?.addEventListener('input', (ev) => {
    root.querySelector('#vc-atm-val').textContent = ev.target.value;
  });
  root.querySelector('#vc-atm')?.addEventListener('change', saveFlags);

  // Open scene button
  root.querySelector('#vc-open-scene-btn')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const domain = root.querySelector('input[name="vc-domain"]:checked')?.value ?? 'none';
    if (domain === 'none') return;
    import('/systems/continuum-v2/modules/vehicle-combat/projector/foundry-app-shell.js').then((m) => {
      const currentScene = canvas.scene;
      if (currentScene) m.openVehicleCombatScene(currentScene);
    });
  });

  // Resize dialog
  if (app.setPosition) app.setPosition();
}